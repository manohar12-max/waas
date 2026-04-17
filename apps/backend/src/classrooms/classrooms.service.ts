import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Classroom, ClassroomDocument } from './classroom.schema';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectModel(Classroom.name) private classroomModel: Model<ClassroomDocument>,
  ) {}

  async create(createClassroomDto: any, collegeId: string): Promise<ClassroomDocument> {
    const classroom = new this.classroomModel({
      ...createClassroomDto,
      collegeId: new Types.ObjectId(collegeId),
    });
    return classroom.save();
  }

  async findAll(collegeId: string): Promise<ClassroomDocument[]> {
    return this.classroomModel
      .find({ collegeId: new Types.ObjectId(collegeId) })
      .populate('teacherId', 'name email')
      .exec();
  }

  async delete(id: string, collegeId: string): Promise<any> {
    return this.classroomModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      collegeId: new Types.ObjectId(collegeId),
    }).exec();
  }
}
