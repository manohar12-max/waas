import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Assignment, AssignmentDocument } from './assignment.schema';
import { Submission, SubmissionDocument } from './submission.schema';
import { User, UserDocument } from '../users/user.schema';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async createAssignment(data: any, teacherId: string) {
    const assignment = new this.assignmentModel({
      ...data,
      divisionId: new Types.ObjectId(data.divisionId),
      workshopId: new Types.ObjectId(data.workshopId),
      teacherId: new Types.ObjectId(teacherId),
    });
    return assignment.save();
  }

  async getAssignmentsByDivision(divisionId: string) {
    console.log(`[AssignmentsService] Fetching for division: ${divisionId}`);
    const results = await this.assignmentModel.find({ divisionId: new Types.ObjectId(divisionId) }).exec();
    console.log(`[AssignmentsService] Found ${results.length} assignments`);
    return results;
  }

  async findAllAssignments() {
     return this.assignmentModel.find({}).exec();
  }

  async getAssignmentById(id: string) {
    return this.assignmentModel.findById(id).populate('workshopId').exec();
  }

  async validateStudentForAssignment(emailOrPhone: string, assignmentId: string) {
    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) throw new BadRequestException('Mission not found.');

    // Find the workshop associated with this assignment
    // Assuming assignment.workshopId is populated or is an ID. 
    // If not populated, we need to fetch it.
    const workshopId = (assignment.workshopId as any)._id || assignment.workshopId;
    
    // Find a student that matches email or phone AND is in the workshop's registeredStudentIds
    const student = await this.userModel.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phone: emailOrPhone }
      ],
      role: 'STUDENT'
    }).exec();

    if (!student) throw new BadRequestException('Identity not found in our records.');

    // Fetch the workshop to check membership
    const workshop = await this.assignmentModel.db.model('Workshop').findById(workshopId).exec();
    if (!workshop) throw new BadRequestException('Curriculum context missing.');

    const isRegistered = (workshop as any).registeredStudentIds.some(
      (id: Types.ObjectId) => id.toString() === student._id.toString()
    );

    if (!isRegistered) throw new BadRequestException('You are not registered for this workshop.');

    return { 
      success: true, 
      studentId: student._id, 
      assignment,
      studentName: student.name 
    };
  }

  async createSubmission(studentId: string, assignmentId: string, divisionId: string, payload: any) {
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submittedAt = new Date();
    const isLate = submittedAt > new Date(assignment.dueDate);

    const submission = new this.submissionModel({
      assignmentId: new Types.ObjectId(assignmentId),
      studentId: new Types.ObjectId(studentId),
      ...payload,
      submittedAt,
      status: isLate ? 'late' : 'submitted',
    });

    return submission.save();
  }

  generateSubmissionToken(studentId: string, assignmentId: string, divisionId: string) {
    return this.jwtService.sign({
      sid: studentId,
      aid: assignmentId,
      did: divisionId,
    }, { expiresIn: '7d' });
  }

  verifySubmissionToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired submission token');
    }
  }

  async submitAssignment(assignmentIdFromParams: string, payload: any) {
    let studentId: string;
    let aid: string;

    if (payload.token) {
      const decoded = this.verifySubmissionToken(payload.token);
      studentId = decoded.sid;
      aid = decoded.aid;
      
      if (aid !== assignmentIdFromParams) {
        throw new UnauthorizedException('Token assignment mismatch');
      }
    } else if (payload.studentId) {
      studentId = payload.studentId;
      aid = assignmentIdFromParams;
    } else {
      throw new UnauthorizedException('Identity verification required');
    }

    const assignment = await this.getAssignmentById(aid);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submittedAt = new Date();
    const isLate = submittedAt > new Date(assignment.dueDate);

    // Check for existing submission (Update logic)
    const existingSubmission = await this.submissionModel.findOne({
      assignmentId: new Types.ObjectId(aid),
      studentId: new Types.ObjectId(studentId),
    });

    if (existingSubmission) {
      existingSubmission.submissionType = payload.submissionType;
      existingSubmission.link = payload.link;
      existingSubmission.fileUrl = payload.fileUrl;
      existingSubmission.submittedAt = submittedAt;
      existingSubmission.status = isLate ? 'late' : 'submitted';
      return existingSubmission.save();
    }

    const submission = new this.submissionModel({
      assignmentId: new Types.ObjectId(aid),
      studentId: new Types.ObjectId(studentId),
      submissionType: payload.submissionType,
      link: payload.link,
      fileUrl: payload.fileUrl,
      submittedAt,
      status: isLate ? 'late' : 'submitted',
    });

    return submission.save();
  }

  async getSubmissions(assignmentId: string) {
    return this.submissionModel.find({ assignmentId: new Types.ObjectId(assignmentId) })
      .populate('studentId', 'name email')
      .exec();
  }

  async gradeSubmission(submissionId: string, data: any, teacherId: string) {
    return this.submissionModel.findByIdAndUpdate(submissionId, {
      marks: data.marks,
      feedback: data.feedback,
      gradedBy: new Types.ObjectId(teacherId),
      gradedAt: new Date(),
    }, { new: true }).exec();
  }
}
