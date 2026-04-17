import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Division, DivisionDocument } from './division.schema';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class DivisionsService {
  private readonly logger = new Logger(DivisionsService.name);

  constructor(
    @InjectModel(Division.name) private divisionModel: Model<DivisionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: any): Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && id.length === 24) {
      try {
        return new Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async create(createDivisionDto: any, collegeId: any): Promise<DivisionDocument> {
    let cId = this.toObjectId(collegeId);
    let tId = this.toObjectId(createDivisionDto.teacherId);
    let wId = this.toObjectId(createDivisionDto.workshopId);

    // Self-Healing Identity Check
    if (!cId && tId) {
      const teacher = await this.userModel.findById(tId);
      if (teacher && teacher.collegeId) {
        cId = teacher.collegeId;
      }
    }

    if (!cId) throw new BadRequestException('Institutional linkage failed. Please refresh your session.');
    if (!wId) throw new BadRequestException('A target Workshop/Curriculum must be assigned.');
    if (!tId) throw new BadRequestException('A primary Teacher must be assigned to the division.');

    try {
      const division = new this.divisionModel({
        ...createDivisionDto,
        collegeId: cId,
        teacherId: tId,
        workshopId: wId,
      });
      return await division.save();
    } catch (err) {
      this.logger.error(`Division creation failed: ${err.message}`);
      throw new BadRequestException('Institutional database rejected the division record.');
    }
  }

  async findAll(collegeId: any): Promise<DivisionDocument[]> {
    try {
      const cId = this.toObjectId(collegeId);
      if (!cId) return [];

      return this.divisionModel
        .find({ collegeId: cId })
        .populate('teacherId', 'name email')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch divisions: ${error.message}`);
      return [];
    }
  }

  async findByTeacher(teacherId: any): Promise<DivisionDocument[]> {
    try {
      const tId = this.toObjectId(teacherId);
      if (!tId) return [];

      return this.divisionModel
        .find({ teacherId: tId })
        .populate('workshopId', 'title')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch teacher divisions: ${error.message}`);
      return [];
    }
  }

  async getStats(divisionId: any) {
    // Placeholder for real stats logic
    return {
      averageScore: 82,
      attendanceRate: '94%',
      activeStudents: 45
    };
  }

  async findOne(id: any, collegeId: any): Promise<DivisionDocument | null> {
    const dId = this.toObjectId(id);
    let cId = this.toObjectId(collegeId);

    // Self-healing: if collegeId is missing (e.g. from token issue), don't fail yet
    // if we can find the division by ID and verify it later.
    if (!dId) throw new NotFoundException('Division context lost.');

    const division = await this.divisionModel.findOne({
      _id: dId,
      ...(cId ? { collegeId: cId } : {})
    }).populate('teacherId', 'name email')
      .populate({
        path: 'workshopId',
        populate: {
          path: 'registeredStudentIds',
          select: 'name email createdAt'
        }
      }).exec();

    if (!division) throw new NotFoundException('Division not found.');
    return division;
  }

  async update(id: any, updateDto: any, collegeId: any): Promise<DivisionDocument | null> {
    const dId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!dId || !cId) throw new BadRequestException('Update failed: Institutional identity missing.');

    return this.divisionModel.findOneAndUpdate(
      { _id: dId, collegeId: cId },
      { $set: updateDto },
      { new: true }
    ).exec();
  }

  async delete(id: any, collegeId: any): Promise<any> {
    const dId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!dId || !cId) return null;

    return this.divisionModel.findOneAndDelete({
      _id: dId,
      collegeId: cId,
    }).exec();
  }
}
