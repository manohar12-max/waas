import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { Assignment, AssignmentDocument } from './assignment.schema';
import { Submission, SubmissionDocument } from './submission.schema';
import { User, UserDocument } from '../users/user.schema';
import { GlobalRulesService } from '../global-rules/global-rules.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private globalRules: GlobalRulesService,
  ) {}

  async createAssignment(data: any, teacherId: string) {
    this.logger.log(`Creating assignment: ${data.title} by teacher ${teacherId}`);
    const assignment = new this.assignmentModel({
      ...data,
      divisionId: new Types.ObjectId(data.divisionId),
      workshopId: new Types.ObjectId(data.workshopId),
      teacherId: new Types.ObjectId(teacherId),
    });
    return assignment.save();
  }

  async getAssignmentsByDivision(divisionId: string) {
    this.logger.log(`Fetching assignments for division: ${divisionId}`);
    const results = await this.assignmentModel.find({ divisionId: new Types.ObjectId(divisionId) }).exec();
    this.logger.log(`Found ${results.length} assignments for division ${divisionId}`);
    return results;
  }

  async findAllAssignments() {
     return this.assignmentModel.find({}).exec();
  }

  async getStudentAssignmentStats(studentId: string) {
    this.logger.log(`Fetching assignment stats for student: ${studentId}`);
    const now = new Date();

    // 1. Find workshops student is registered in
    const workshops = await this.assignmentModel.db.model('Workshop').find({
      registeredStudentIds: new Types.ObjectId(studentId)
    }).select('_id').exec();

    const workshopIds = workshops.map((w: any) => w._id);

    // 2. Fetch ALL active assignments for these workshops
    const allAssignments = await this.assignmentModel.find({
      workshopId: { $in: workshopIds },
      status: 'ACTIVE'
    })
      .populate('workshopId', 'title')
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 })
      .exec();

    // 3. Fetch this student's submissions
    const submissionIds = allAssignments.map((a: any) => a._id);
    const submissions = await this.submissionModel.find({
      assignmentId: { $in: submissionIds },
      studentId: new Types.ObjectId(studentId)
    }).exec();

    const submittedAssignmentIds = new Set(submissions.map((s: any) => s.assignmentId.toString()));

    // 4. Categorize
    const pending: any[] = [];   // Not due yet, not submitted
    const pastDue: any[] = [];   // Overdue and NOT submitted
    const submitted: any[] = []; // Already submitted (on time or late)

    for (const assignment of allAssignments) {
      const id = (assignment as any)._id.toString();
      const isSubmitted = submittedAssignmentIds.has(id);
      const isPastDue = now > new Date(assignment.dueDate);

      if (isSubmitted) {
        const sub = submissions.find((s: any) => s.assignmentId.toString() === id);
        submitted.push({ ...assignment.toObject(), submission: sub });
      } else if (isPastDue) {
        pastDue.push(assignment.toObject());
      } else {
        pending.push(assignment.toObject());
      }
    }

    return {
      pending,
      pastDue,
      submitted,
      counts: {
        total: allAssignments.length,
        pending: pending.length,
        pastDue: pastDue.length,
        submitted: submitted.length,
      }
    };
  }

  async getAssignmentById(id: string) {
    return this.assignmentModel.findById(id).populate('workshopId').exec();
  }

  async validateStudentForAssignment(emailOrPhone: string, assignmentId: string) {
    this.logger.log(`Validating student ${emailOrPhone} for assignment ${assignmentId}`);
    const assignment = await this.getAssignmentById(assignmentId);
    if (!assignment) {
      this.logger.warn(`Assignment not found: ${assignmentId}`);
      throw new BadRequestException('Mission not found.');
    }

    // Date Validation — respect allow_late_submissions rule
    const now = new Date();
    if (now > assignment.dueDate) {
      const rules = await this.globalRules.get();
      if (!rules.allow_late_submissions) {
        this.logger.warn(`Validation failed: Assignment ${assignment.title} is past due and late submissions are disabled.`);
        throw new BadRequestException('The submission window for this assignment has closed. Late submissions are not accepted.');
      }
      this.logger.log(`Late submission allowed for assignment ${assignment.title}`);
    }

    const workshopId = (assignment.workshopId as any)._id || assignment.workshopId;
    
    // Find a student that matches email or phone
    const student = await this.userModel.findOne({
      $or: [
        { email: emailOrPhone.toLowerCase() },
        { phone: emailOrPhone }
      ],
      role: 'STUDENT'
    }).exec();

    if (!student) {
      this.logger.warn(`Identity not found: ${emailOrPhone}`);
      throw new BadRequestException('Identity not found in our records.');
    }

    // Fetch the workshop to check membership
    const workshop = await this.assignmentModel.db.model('Workshop').findById(workshopId).exec();
    if (!workshop) {
      this.logger.error(`Curriculum context missing for workshop ${workshopId}`);
      throw new BadRequestException('Curriculum context missing.');
    }

    const isRegistered = (workshop as any).registeredStudentIds.some(
      (id: Types.ObjectId) => id.toString() === student._id.toString()
    );

    if (!isRegistered) {
      this.logger.warn(`Student ${student.email} not registered for workshop ${workshopId}`);
      throw new BadRequestException('You are not registered for this workshop.');
    }

    this.logger.log(`Validation successful for student: ${student.email}`);
    return { 
      success: true, 
      studentId: student._id, 
      assignment,
      studentName: student.name 
    };
  }

  async createSubmission(studentId: string, assignmentId: string, divisionId: string, payload: any) {
    this.logger.log(`Creating submission for student ${studentId}, assignment ${assignmentId}`);
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submittedAt = new Date();
    const isLate = submittedAt > new Date(assignment.dueDate);

    // Enforce allow_late_submissions globally
    if (isLate) {
      const rules = await this.globalRules.get();
      if (!rules.allow_late_submissions) {
        throw new ForbiddenException('Late submissions are not accepted. The deadline has passed.');
      }
    }

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
      this.logger.warn('Invalid or expired submission token provided.');
      throw new UnauthorizedException('Invalid or expired submission token');
    }
  }

  async submitAssignment(assignmentIdFromParams: string, payload: any) {
    const assignment = await this.assignmentModel.findById(assignmentIdFromParams).populate('workshopId').exec();
    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    // Check Due Date
    if (new Date() > assignment.dueDate) {
      throw new BadRequestException('Submission window has closed. The due date has passed.');
    }

    let studentId: string;
    let aid: string;

    if (payload.token) {
      const decoded = this.verifySubmissionToken(payload.token);
      studentId = decoded.sid;
      aid = decoded.aid;
      
      if (aid !== assignmentIdFromParams) {
        this.logger.warn(`Token assignment mismatch: token[${aid}] != param[${assignmentIdFromParams}]`);
        throw new UnauthorizedException('Token assignment mismatch');
      }
    } else if (payload.studentId) {
      studentId = payload.studentId;
      aid = assignmentIdFromParams;
    } else {
      throw new UnauthorizedException('Identity verification required');
    }

    this.logger.log(`Submission attempt for student ${studentId}, assignment ${aid}`);
    // Identity confirmed, proceed to submission 

    const submittedAt = new Date();
    const isLate = submittedAt > new Date(assignment.dueDate);

    // Check for existing submission (Update logic)
    const existingSubmission = await this.submissionModel.findOne({
      assignmentId: new Types.ObjectId(aid),
      studentId: new Types.ObjectId(studentId),
    });

    if (existingSubmission) {
      this.logger.log(`Updating existing submission ${existingSubmission._id}`);
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

    this.logger.log(`Created new submission for student ${studentId}`);
    return submission.save();
  }

  async getSubmissions(assignmentId: string) {
    return this.submissionModel.find({ assignmentId: new Types.ObjectId(assignmentId) })
      .populate('studentId', 'name email')
      .exec();
  }

  async gradeSubmission(submissionId: string, data: any, teacherId: string) {
    this.logger.log(`Grading submission ${submissionId} by teacher ${teacherId}`);
    return this.submissionModel.findByIdAndUpdate(submissionId, {
      marks: data.marks,
      feedback: data.feedback,
      gradedBy: new Types.ObjectId(teacherId),
      gradedAt: new Date(),
    }, { new: true }).exec();
  }
}
