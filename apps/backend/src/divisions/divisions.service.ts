import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Division, DivisionDocument } from './division.schema';
import { User, UserDocument } from '../users/user.schema';
import { Workshop, WorkshopDocument } from '../workshops/workshop.schema';
import { Attendance, AttendanceDocument } from '../workshops/attendance.schema';
import { Assignment, AssignmentDocument } from '../assignments/assignment.schema';
import { Submission, SubmissionDocument } from '../assignments/submission.schema';
import { TeacherContent, TeacherContentDocument } from '../workshops/teacher-content.schema';

@Injectable()
export class DivisionsService {
  private readonly logger = new Logger(DivisionsService.name);

  constructor(
    @InjectModel(Division.name) private divisionModel: Model<DivisionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(TeacherContent.name) private teacherContentModel: Model<TeacherContentDocument>,
  ) {}

  private toObjectId(id: any): Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return null;
  }

  async create(createDivisionDto: any, collegeId: any): Promise<DivisionDocument> {
    let cId = this.toObjectId(collegeId);
    let tId = this.toObjectId(createDivisionDto.teacherId);
    let wId = this.toObjectId(createDivisionDto.workshopId);

    this.logger.log(`Attempting to create division for workshop ${wId} in college ${cId}`);

    // Self-Healing Identity Check
    if (!cId && tId) {
      this.logger.log(`CollegeID missing, attempting to resolve from teacher ${tId}`);
      const teacher = await this.userModel.findById(tId);
      if (teacher && teacher.collegeId) {
        cId = teacher.collegeId;
        this.logger.log(`Resolved CollegeID: ${cId}`);
      }
    }

    if (!cId) {
      this.logger.error('Division creation failed: Missing college linkage.');
      throw new BadRequestException('Institutional linkage failed. Please refresh your session.');
    }
    if (!wId) throw new BadRequestException('A target Workshop/Curriculum must be assigned.');
    if (!tId) throw new BadRequestException('A primary Teacher must be assigned to the division.');

    try {
      const division = new this.divisionModel({
        ...createDivisionDto,
        collegeId: cId,
        teacherId: tId,
        workshopId: wId,
      });
      const saved = await division.save();
      this.logger.log(`Division created successfully: ${saved._id}`);
      return saved;
    } catch (err) {
      this.logger.error(`Division creation failed: ${err.message}`, err.stack);
      throw new BadRequestException('Institutional database rejected the division record.');
    }
  }

  async findAll(collegeId: any): Promise<DivisionDocument[]> {
    try {
      const cId = this.toObjectId(collegeId);
      if (!cId) return [];

      this.logger.log(`Fetching all divisions for college ${cId}`);
      return this.divisionModel
        .find({ collegeId: cId })
        .populate('teacherId', 'name email')
        .populate('workshopId', 'title registeredStudentIds pendingStudentIds')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch divisions: ${error.message}`, error.stack);
      return [];
    }
  }

  async findByTeacher(teacherId: any): Promise<DivisionDocument[]> {
    try {
      const tId = this.toObjectId(teacherId);
      if (!tId) return [];

      this.logger.log(`Fetching divisions for teacher ${tId}`);
      return this.divisionModel
        .find({ teacherId: tId })
        .populate('workshopId', 'title inviteToken')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch teacher divisions: ${error.message}`, error.stack);
      return [];
    }
  }

  async getStats(divisionId: any) {
    const dId = this.toObjectId(divisionId);
    if (!dId) return null;

    // 1. Get Assignments for this division
    const assignments = await this.assignmentModel.find({ divisionId: dId });
    const assignmentIds = assignments.map(a => a._id);

    // 2. Get Submissions for these assignments
    const submissions = await this.submissionModel.find({ assignmentId: { $in: assignmentIds } });

    // 3. Get Teacher Content count
    const contentCount = await this.teacherContentModel.countDocuments({ divisionId: dId });

    // 4. Get Division info to get Workshop and Students
    const division = await this.divisionModel.findById(dId).populate('workshopId');
    const workshop = division?.workshopId as any;
    const totalStudents = workshop?.registeredStudentIds?.length || 0;

    // 5. Get Attendance for this workshop
    const attendance = await this.attendanceModel.find({ workshopId: workshop?._id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    // 6. Calculate statistics
    const submissionCount = submissions.length;
    const pendingGrades = submissions.filter(s => !s.gradedAt).length;
    
    // Average score calculation
    const gradedSubmissions = submissions.filter(s => s.gradedAt);
    const averageScore = gradedSubmissions.length > 0 
      ? Math.round(gradedSubmissions.reduce((acc, curr) => acc + curr.marks, 0) / gradedSubmissions.length)
      : 0;

    // Attendance rate
    const uniquePresentStudents = new Set(attendance.filter(a => a.status === 'PRESENT').map(a => a.studentId?._id?.toString())).size;
    const attendanceRate = totalStudents > 0 ? Math.round((uniquePresentStudents / totalStudents) * 100) : 0;

    return {
      assignments: {
        total: assignments.length,
        submissions: submissionCount,
        pending: pendingGrades
      },
      content: {
        total: contentCount
      },
      performance: {
        averageScore,
        attendanceRate,
        activeStudents: totalStudents
      },
      recentAttendance: attendance
    };
  }

  async findOne(id: any, collegeId: any): Promise<any> {
    const dId = this.toObjectId(id);
    let cId = this.toObjectId(collegeId);

    if (!dId) {
      this.logger.error('Division lookup failed: Invalid ID provided.');
      throw new NotFoundException('Division context lost.');
    }

    this.logger.log(`Fetching division ${dId} (CollegeContext: ${cId})`);
    const division = await this.divisionModel.findOne({
      _id: dId,
      ...(cId ? { collegeId: cId } : {})
    }).populate('teacherId', 'name email')
      .populate({
        path: 'workshopId',
        populate: [
          { path: 'registeredStudentIds', select: 'name email createdAt phone' },
          { path: 'pendingStudentIds', select: 'name email createdAt phone' }
        ]
      }).exec();

    if (!division) {
      this.logger.warn(`Division not found: ${dId}`);
      throw new NotFoundException('Division not found.');
    }

    const stats = await this.getStats(dId);
    return {
      ...division.toObject(),
      stats
    };
  }

  async update(id: any, updateDto: any, collegeId: any): Promise<DivisionDocument | null> {
    const dId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!dId || !cId) throw new BadRequestException('Update failed: Institutional identity missing.');

    this.logger.log(`Updating division ${dId}`);
    return this.divisionModel.findOneAndUpdate(
      { _id: dId, collegeId: cId },
      { $set: updateDto },
      { returnDocument: 'after' }
    ).exec();
  }

  async delete(id: any, collegeId: any): Promise<any> {
    const dId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!dId || !cId) return null;

    this.logger.log(`Deleting division ${dId}`);
    return this.divisionModel.findOneAndDelete({
      _id: dId,
      collegeId: cId,
    }).exec();
  }
}
