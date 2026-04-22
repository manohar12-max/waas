import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { Workshop, WorkshopDocument } from './workshop.schema';
import { Attendance, AttendanceDocument } from './attendance.schema';
import { User, UserDocument, UserRole } from '../users/user.schema';
import { WorkshopMediaPost, WorkshopMediaPostDocument } from './media-post.schema';
import { TeacherContent, TeacherContentDocument } from './teacher-content.schema';
import { Session } from './session-content/schemas/session.schema';
import { Day } from './session-content/schemas/day.schema';
import { GlobalRulesService } from '../global-rules/global-rules.service';

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(WorkshopMediaPost.name) private mediaPostModel: Model<WorkshopMediaPostDocument>,
    @InjectModel(TeacherContent.name) private teacherContentModel: Model<TeacherContentDocument>,
    @InjectModel(Session.name) private sessionModel: Model<any>,
    @InjectModel(Day.name) private dayModel: Model<any>,
    private globalRules: GlobalRulesService,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async enrollStudent(enrollDto: any) {
    const email = enrollDto.email?.trim()?.toLowerCase() || '';
    const { inviteToken, name, phone, phoneNumber, password } = enrollDto;
    this.logger.log(`Enrollment attempt: ${email} for token ${inviteToken}`);

    const rules = await this.globalRules.get();

    // ── Global Rule: Self-enrollment disabled ──────────────────────
    if (!rules.allow_self_enrollment) {
      throw new ForbiddenException(
        'Self-enrollment via invite link is currently disabled by the platform administrator.'
      );
    }

    // 1. Validate Invite
    const workshop = await this.workshopModel.findOne({ inviteToken });
    if (!workshop) {
      this.logger.warn(`Enrollment failed: Invalid token ${inviteToken}`);
      throw new NotFoundException('Invalid institutional link.');
    }

    // ── Global Rule: Max students per workshop ─────────────────────
    const maxStudents = rules.max_students_per_workshop || 0;
    if (maxStudents > 0 && workshop.registeredStudentIds.length >= maxStudents) {
      throw new BadRequestException(
        `This workshop has reached its maximum capacity of ${maxStudents} students.`
      );
    }

    // Date Validation
    const now = new Date();
    if (workshop.registrationPeriod) {
      if (now < workshop.registrationPeriod.start) {
        this.logger.warn(`Enrollment attempt too early: ${email} for ${workshop.title}`);
        throw new BadRequestException('Registration for this workshop has not started yet.');
      }
      if (now > workshop.registrationPeriod.end) {
        this.logger.warn(`Enrollment attempt too late: ${email} for ${workshop.title}`);
        throw new BadRequestException('Registration for this workshop has ended.');
      }
    }

    // 2. Resolve Student Identity
    let student = await this.userModel.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (student) {
      // Identity exists, check if already enrolled in THIS workshop
      const isAlreadyEnrolled = workshop.registeredStudentIds.some(
        (id: any) => id.toString() === student!._id.toString()
      );

      if (isAlreadyEnrolled) {
        this.logger.warn(`Enrollment failed: Student ${email} already in workshop ${workshop.title}`);
        throw new ConflictException('You are already registered for this workshop.');
      }

      const isPending = (workshop.pendingStudentIds || []).some(
        (id: any) => id.toString() === student!._id.toString()
      );
      if (isPending) {
        throw new ConflictException('Your registration is pending approval.');
      }
      
      this.logger.log(`Existing student ${email} applying for new workshop: ${workshop.title}`);
    } else {
      // 3. Create Identity if not exists
      this.logger.log(`Creating new identity for student: ${email}`);
      const finalPassword = password || (Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      student = new this.userModel({
        name,
        email,
        phone,
        phoneNumber,
        password: hashedPassword,
        role: UserRole.STUDENT,
        collegeId: workshop.collegeId,
        active: true
      });

      student = await student.save();
      this.logger.log(`New student identity created: ${student.email} [ID: ${student._id}]`);
    }

    // 4. Link to Workshop (as Pending)
    await this.workshopModel.findByIdAndUpdate(workshop._id, {
      $addToSet: { pendingStudentIds: student._id }
    });

    this.logger.log(`Student ${student.email} registration pending for workshop: ${workshop.title}`);

    return {
      success: true,
      pending: true,
      workshop: workshop.title,
      student: student.name
    };
  }

  async createStudentForWorkshop(workshopId: string, studentData: any, collegeId: any) {
    const { name, email, phone, password } = studentData;
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check if workshop exists
    const workshop = await this.workshopModel.findById(workshopId);
    if (!workshop) throw new NotFoundException('Workshop not found');

    // 2. Resolve Student Identity
    let student = await this.userModel.findOne({ 
      email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') } 
    });
    
    if (student) {
      if (student.role !== UserRole.STUDENT) {
        throw new ConflictException('A user with this email already exists with a different role (Teacher/Admin).');
      }
    } else {
      // Create new student identity
      const hashedPassword = await bcrypt.hash(password || 'Nexus@123', 10);
      student = new this.userModel({
        name,
        email: trimmedEmail,
        phone,
        password: hashedPassword,
        role: UserRole.STUDENT,
        collegeId: this.toObjectId(collegeId),
        active: true
      });
      student = await student.save();
      this.logger.log(`Created new student account for ${trimmedEmail}`);
    }

    // 3. Enroll in Workshop
    await this.workshopModel.findByIdAndUpdate(workshopId, {
      $addToSet: { registeredStudentIds: (student as any)._id }
    });

    return student;
  }

  private toObjectId(id: any): Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return null;
  }

  async create(createWorkshopDto: any, collegeId: any): Promise<WorkshopDocument> {
    this.logger.log(`Attempting Workshop Creation. CollegeID: ${collegeId}, InstructorID: ${createWorkshopDto.instructorId}`);

    let cId = this.toObjectId(collegeId);
    let iId = this.toObjectId(createWorkshopDto.instructorId);

    // SELF-HEALING: If collegeId is missing from session, try to find it from the instructor's profile
    if (!cId && iId) {
      this.logger.log('CollegeID missing from session. Attempting instructor-based auto-resolution...');
      const instructor = await this.userModel.findById(iId);
      if (instructor && instructor.collegeId) {
        cId = instructor.collegeId;
        this.logger.log(`Auto-resolved CollegeID: ${cId}`);
      }
    }

    if (!cId) {
      this.logger.error('Security Violation: Workshop deployment failed due to missing institutional linkage.');
      throw new BadRequestException('Your account is not properly linked to a College. Please logout and login again.');
    }
    if (!iId) {
      this.logger.error('Validation Failure: No Technical Instructor assigned to workshop.');
      throw new BadRequestException('A lead Instructor must be assigned to deploy this curriculum.');
    }

    // Role Validation: Ensure instructorId has INSTRUCTOR role
    const instructor = await this.userModel.findById(iId);
    if (!instructor || instructor.role !== UserRole.INSTRUCTOR) {
      this.logger.warn(`Validation Failure: User ${iId} is not an instructor.`);
      throw new BadRequestException('The assigned user must have the Instructor role.');
    }

    try {
      const inviteToken = Math.random().toString(36).substring(2, 10).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase();

      const workshop = new this.workshopModel({
        ...createWorkshopDto,
        collegeId: cId,
        instructorId: iId,
        inviteToken,
      });
      const saved = await workshop.save();
      this.logger.log(`Workshop Deployed Successfully: ${saved._id} (Invite: ${inviteToken})`);
      return saved;
    } catch (err) {
      this.logger.error(`Database Error during workshop deployment: ${err.message}`, err.stack);
      throw new BadRequestException('Institutional database rejected the workshop record.');
    }
  }

  async validateInvite(token: string) {
    this.logger.log(`Validating invite token: ${token}`);
    const workshop = await this.workshopModel.findOne({ inviteToken: token })
      .populate('collegeId', 'name')
      .populate('instructorId', 'name email')
      .exec();

    if (!workshop) {
      this.logger.warn(`Invalid invite token: ${token}`);
      throw new NotFoundException('Invalid or expired invitation link.');
    }

    // Informational only — does NOT block the link from loading
    const now = new Date();
    let registrationStatus: 'open' | 'not_started' | 'closed' = 'open';
    if (workshop.registrationPeriod) {
      if (now < workshop.registrationPeriod.start) registrationStatus = 'not_started';
      else if (now > workshop.registrationPeriod.end) registrationStatus = 'closed';
    }

    return { ...workshop.toObject(), registrationStatus };
  }


  async findAll(collegeId: any, instructorId?: any, studentId?: any): Promise<WorkshopDocument[]> {
    try {
      const cId = this.toObjectId(collegeId);
      if (!cId) return [];

      const query: any = { collegeId: cId };
      
      if (instructorId) {
        const iId = this.toObjectId(instructorId);
        if (iId) query.instructorId = iId;
      }

      if (studentId) {
        const sId = this.toObjectId(studentId);
        if (sId) query.registeredStudentIds = sId;
      }

      return this.workshopModel
        .find(query)
        .populate('instructorId', 'name email')
        .sort({ 'schedule.start': 1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch workshops: ${error.message}`, error.stack);
      return [];
    }
  }

  /** Super Admin: get all workshops for a specific college by raw string ID */
  async findAllByCollegeId(collegeId: string): Promise<WorkshopDocument[]> {
    try {
      const cId = this.toObjectId(collegeId);
      if (!cId) return [];
      return this.workshopModel
        .find({ collegeId: cId })
        .populate('instructorId', 'name email')
        .populate('collegeId', 'name')
        .sort({ 'schedule.start': -1 })
        .exec();
    } catch (err) {
      this.logger.error(`findAllByCollegeId failed: ${err.message}`);
      return [];
    }
  }

  async findByInstructor(instructorId: any): Promise<WorkshopDocument[]> {
    try {
      const iId = this.toObjectId(instructorId);
      if (!iId) return [];

      return this.workshopModel
        .find({ instructorId: iId })
        .populate('instructorId', 'name email')
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch instructor workshops: ${error.message}`, error.stack);
      return [];
    }
  }

  async update(id: any, updateDto: any): Promise<WorkshopDocument | null> {
    const wId = this.toObjectId(id);
    if (!wId) throw new BadRequestException('Invalid Workshop ID.');

    this.logger.log(`Updating workshop: ${wId}`);
    return this.workshopModel.findByIdAndUpdate(
      wId,
      { $set: updateDto },
      { new: true }
    ).exec();
  }

  async findOne(id: any, collegeId: any, userId?: any, role?: string): Promise<WorkshopDocument | null> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId) throw new NotFoundException('Workshop not found.');

    const query: any = { _id: wId };
    
    // For non-super-admins, we usually restrict by collegeId 
    // EXCEPT for instructors who should always see their assigned workshops
    if (role !== UserRole.SUPER_ADMIN) {
      if (role === UserRole.INSTRUCTOR && userId) {
        // Allow if it's THEIR workshop OR same college
        query.$or = [
          { collegeId: cId },
          { instructorId: this.toObjectId(userId) }
        ];
      } else if (cId) {
        query.collegeId = cId;
      }
    }

    const workshop = await this.workshopModel.findOne(query)
      .populate('instructorId', 'name email')
      .populate('registeredStudentIds', 'name email createdAt phone')
      .populate('pendingStudentIds', 'name email createdAt phone')
      .exec();

    if (!workshop) {
      this.logger.warn(`Workshop not found: ${wId}`);
      throw new NotFoundException('Workshop not found.');
    }

    // Access Control for Students
    if (role === UserRole.STUDENT && userId) {
      const isRegistered = workshop.registeredStudentIds.some(
        (sid: any) => {
          const idStr = sid._id ? sid._id.toString() : sid.toString();
          return idStr === userId.toString();
        }
      );
      if (!isRegistered) {
        throw new ForbiddenException('You are not registered for this workshop or your registration is pending approval.');
      }
    }

    return workshop;
  }

  async registerStudent(inviteToken: string, studentId: any) {
    const sId = this.toObjectId(studentId);
    if (!sId) return null;

    this.logger.log(`Registering student ${sId} to workshop with token ${inviteToken}`);
    return this.workshopModel.findOneAndUpdate(
      { inviteToken },
      { $addToSet: { registeredStudentIds: sId } },
      { new: true }
    ).exec();
  }

  async approveStudent(workshopId: string, studentId: string) {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    this.logger.log(`Approving student ${sId} for workshop ${wId}`);

    return this.workshopModel.findByIdAndUpdate(wId, {
      $pull: { pendingStudentIds: sId },
      $addToSet: { registeredStudentIds: sId }
    }, { new: true }).populate('registeredStudentIds pendingStudentIds');
  }

  async bulkApproveStudents(workshopId: string, studentIds: string[]) {
    const wId = this.toObjectId(workshopId);
    const sIds = studentIds.map(id => this.toObjectId(id)).filter(id => !!id);
    this.logger.log(`Bulk approving ${sIds.length} students for workshop ${wId}`);

    return this.workshopModel.findByIdAndUpdate(wId, {
      $pull: { pendingStudentIds: { $in: sIds } },
      $addToSet: { registeredStudentIds: { $each: sIds } }
    }, { new: true }).populate('registeredStudentIds pendingStudentIds');
  }

  async rejectStudent(workshopId: string, studentId: string) {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    this.logger.log(`Rejecting student ${sId} for workshop ${wId}`);

    return this.workshopModel.findByIdAndUpdate(wId, {
      $pull: { pendingStudentIds: sId }
    }, { new: true }).populate('registeredStudentIds pendingStudentIds');
  }

  async bulkRejectStudents(workshopId: string, studentIds: string[]) {
    const wId = this.toObjectId(workshopId);
    const sIds = studentIds.map(id => this.toObjectId(id)).filter(id => !!id);
    this.logger.log(`Bulk rejecting ${sIds.length} students for workshop ${wId}`);

    return this.workshopModel.findByIdAndUpdate(wId, {
      $pull: { pendingStudentIds: { $in: sIds } }
    }, { new: true }).populate('registeredStudentIds pendingStudentIds');
  }

  async delete(id: any, collegeId: any): Promise<any> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId || !cId) return null;

    this.logger.log(`Deleting workshop: ${wId} in college ${cId}`);
    return this.workshopModel.findOneAndDelete({
      _id: wId,
      collegeId: cId,
    }).exec();
  }

  async updateStatus(id: any, status: string, collegeId: any): Promise<any> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId || !cId) throw new BadRequestException('Status update failed: Identity mismatch.');

    this.logger.log(`Status update for workshop ${wId}: ${status}`);
    return this.workshopModel.findOneAndUpdate(
      { _id: wId, collegeId: cId },
      { $set: { status } },
      { new: true }
    ).exec();
  }

  async validateStudentRegistration(workshopId: string, studentId: string) {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    if (!wId || !sId) throw new BadRequestException('Invalid ID format.');

    const workshop = await this.workshopModel.findById(wId);
    if (!workshop) throw new NotFoundException('Workshop not found.');
    
    const isRegistered = workshop.registeredStudentIds.some(
      (rid: any) => rid.toString() === sId.toString()
    );

    if (!isRegistered) {
      throw new ForbiddenException('You are not registered for this workshop or your registration is pending approval.');
    }
  }

  async recordAttendance(workshopId: any, studentId: any, verifiedBy: any, method: string): Promise<any> {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    const vId = this.toObjectId(verifiedBy);

    if (!wId || !sId || !vId) {
      this.logger.error(`Attendance recording failed: ID mismatch. Workshop: ${workshopId}, Student: ${studentId}, Verifier: ${verifiedBy}`);
      throw new BadRequestException('Attendance recording failed: Reference ID corruption.');
    }

    this.logger.log(`Recording attendance: workshop ${wId}, student ${sId}, method ${method}`);

    // Verify Registration
    const workshop = await this.workshopModel.findById(wId);
    if (!workshop) throw new NotFoundException('Workshop not found.');
    
    const isRegistered = workshop.registeredStudentIds.some(
      (rid: any) => rid.toString() === sId!.toString()
    );

    if (!isRegistered) {
      this.logger.warn(`Attendance failed: Student ${sId} not registered for workshop ${wId}`);
      throw new ForbiddenException('Student is not officially registered for this workshop.');
    }

    return this.attendanceModel.findOneAndUpdate(
      { workshopId: wId, studentId: sId },
      {
        $set: {
          date: new Date(),
          status: 'PRESENT',
          verificationMethod: method,
          verifiedBy: vId
        }
      },
      { upsert: true, new: true }
    ).exec();
  }

  async checkinByEmail(workshopId: string, email: string): Promise<any> {
    const wId = this.toObjectId(workshopId);
    if (!wId) throw new BadRequestException('Invalid Workshop ID.');

    this.logger.log(`Self-checkin attempt: ${email} for workshop ${wId}`);

    // 1. Find Student
    const student = await this.userModel.findOne({ email, role: UserRole.STUDENT });
    if (!student) {
      this.logger.warn(`Self-checkin failed: Student ${email} not found.`);
      throw new NotFoundException('Student identity not found in institutional records.');
    }

    // 2. Verify Registration
    const isRegistered = await this.workshopModel.findOne({
      _id: wId,
      registeredStudentIds: student._id
    });
    if (!isRegistered) {
      this.logger.warn(`Self-checkin failed: Student ${email} not registered for workshop ${wId}`);
      throw new BadRequestException('You are not registered for this curriculum session.');
    }

    // 3. Mark Present (Self-Checkin)
    return this.recordAttendance(wId, student._id, student._id, 'QR_SCAN');
  }

  async unmarkAttendance(workshopId: any, studentId: any): Promise<any> {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    if (!wId || !sId) throw new BadRequestException('Reference ID mismatch.');

    this.logger.log(`Unmarking attendance: workshop ${wId}, student ${sId}`);
    return this.attendanceModel.findOneAndDelete({ workshopId: wId, studentId: sId }).exec();
  }

  async overrideAttendance(id: any, status: string, teacherId: any): Promise<any> {
    const aId = this.toObjectId(id);
    const tId = this.toObjectId(teacherId);

    if (!aId || !tId) throw new BadRequestException('Attendance override failed: Identity context missing.');

    this.logger.log(`Attendance override: record ${aId}, new status ${status}, by teacher ${tId}`);
    return this.attendanceModel.findOneAndUpdate(
      { _id: aId },
      { $set: { status, verifiedBy: tId } },
      { new: true }
    ).exec();
  }

  async getAttendanceForWorkshop(workshopId: any | any[]): Promise<any[]> {
    const ids = Array.isArray(workshopId) ? workshopId : [workshopId];
    const objectIds = ids.map(id => this.toObjectId(id)).filter(id => !!id);
    if (objectIds.length === 0) return [];

    return this.attendanceModel
      .find({ workshopId: { $in: objectIds } })
      .populate('studentId', 'name email phone')
      .exec();
  }

  async findManyByTitle(title: string, collegeId: any): Promise<WorkshopDocument[]> {
    const cId = this.toObjectId(collegeId);
    if (!cId) return [];
    return this.workshopModel.find({ 
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      collegeId: cId 
    }).exec();
  }

  // --- Media Feed Methods ---
  async createMediaPost(createDto: any, teacherId: string): Promise<WorkshopMediaPostDocument> {
    const wId = this.toObjectId(createDto.workshopId);
    this.logger.log(`Creating media post for workshop: ${wId} by teacher ${teacherId}`);
    
    const post = new this.mediaPostModel({
      ...createDto,
      workshopId: wId,
      teacherId: this.toObjectId(teacherId),
    });
    return post.save();
  }

  async getMediaFeed(workshopId: string): Promise<WorkshopMediaPostDocument[]> {
    return this.mediaPostModel
      .find({ workshopId: this.toObjectId(workshopId) })
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateMediaPost(id: string, updateDto: any): Promise<WorkshopMediaPostDocument | null> {
    return this.mediaPostModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: updateDto },
      { new: true }
    ).exec();
  }

  async likeMediaPost(postId: string, userId: string): Promise<WorkshopMediaPostDocument | null> {
    const post = await this.mediaPostModel.findById(this.toObjectId(postId));
    if (!post) throw new NotFoundException('Media post not found');

    const uId = this.toObjectId(userId);
    if (!uId) throw new BadRequestException('Invalid User ID');

    const likes = post.likes || [];
    const index = likes.findIndex(id => id.toString() === uId.toString());

    if (index > -1) {
      likes.splice(index, 1); // Unlike
    } else {
      likes.push(uId); // Like
    }

    post.likes = likes;
    return post.save();
  }

  // --- Teacher Content Methods ---
  async createTeacherContent(createDto: any, teacherId: string): Promise<TeacherContentDocument> {
    const { shareToMediaFeed, ...data } = createDto;
    this.logger.log(`Creating teacher content for workshop: ${data.workshopId} by teacher ${teacherId}`);
    
    const content = new this.teacherContentModel({
      ...data,
      workshopId: this.toObjectId(data.workshopId),
      divisionId: this.toObjectId(data.divisionId),
      teacherId: this.toObjectId(teacherId),
    });
    const savedContent = await content.save();

    // Mirror to Media Feed if requested and type is IMAGE or VIDEO
    if (shareToMediaFeed && (data.type === 'IMAGE' || data.type === 'VIDEO')) {
        try {
            this.logger.log(`Mirroring content to Media Feed: ${savedContent._id}`);
            await this.createMediaPost({
                workshopId: data.workshopId,
                mediaType: data.type,
                mediaUrl: data.url,
                caption: data.title,
                description: data.description
            }, teacherId);
        } catch (err) {
            this.logger.error('Mirroring to Media Feed Failed', err.stack);
        }
    }

    return savedContent;
  }

  async getPersonalContent(teacherId: string): Promise<TeacherContentDocument[]> {
    return this.teacherContentModel
      .find({ teacherId: this.toObjectId(teacherId) })
      .populate('teacherId', 'name email')
      .populate('workshopId', 'title')
      .populate('divisionId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAggregatedContent(workshopId: string, divisionId?: string): Promise<TeacherContentDocument[]> {
    const query: any = { workshopId: this.toObjectId(workshopId) };
    if (divisionId) {
      query.divisionId = this.toObjectId(divisionId);
    }
    return this.teacherContentModel
      .find(query)
      .populate('teacherId', 'name email')
      .populate('divisionId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  // --- Deletion Methods ---
  private extractPublicId(url: string): string {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1]; // public_id.jpg
    return lastPart.split('.')[0]; // public_id
  }

  async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    this.logger.log(`Uploading file ${file.originalname} to Cloudinary...`);
    
    // Determine the resource type for Cloudinary
    let resource_type: 'image' | 'video' | 'raw' | 'auto' = 'auto';
    if (file.mimetype.startsWith('image/')) resource_type = 'image';
    else if (file.mimetype.startsWith('video/')) resource_type = 'video';
    else if (file.mimetype === 'application/pdf') resource_type = 'raw';

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { resource_type, folder: 'nexus_platform' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary Upload Failed: ${error.message}`, error.stack);
            return reject(new BadRequestException(`Cloudinary Upload Failed: ${error.message}`));
          }
          if (!result) return reject(new BadRequestException('Cloudinary upload returned no result'));
          
          this.logger.log(`Cloudinary Upload Success: ${result.secure_url}`);
          resolve(result.secure_url);
        }
      );

      // Multer file.buffer contains the file data
      upload.end(file.buffer);
    });
  }

  async deleteMediaPost(id: string): Promise<any> {
    const post = await this.mediaPostModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    
    this.logger.log(`Deleting media post: ${id}`);
    try {
      const publicId = this.extractPublicId(post.mediaUrl);
      const resourceType = post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$|^.*video\/upload.*$/) ? 'video' : 'image';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      this.logger.error(`Cloudinary Delete Failed: ${err.message}`, err.stack);
    }
    
    return this.mediaPostModel.findByIdAndDelete(id);
  }

  async deleteTeacherContent(id: string): Promise<any> {
    const content = await this.teacherContentModel.findById(id);
    if (!content) throw new NotFoundException('Content not found');
    
    this.logger.log(`Deleting teacher content: ${id}`);
    try {
      if (content.type !== 'LINK') {
        const publicId = this.extractPublicId(content.url);
        const resourceType = content.type === 'VIDEO' ? 'video' : content.type === 'PDF' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }
    } catch (err) {
      this.logger.error(`Cloudinary Delete Failed: ${err.message}`, err.stack);
    }
    
    return this.teacherContentModel.findByIdAndDelete(id);
  }

  async updateTeacherContent(id: string, updateDto: any): Promise<TeacherContentDocument | null> {
    return this.teacherContentModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: updateDto },
      { new: true }
    ).exec();
  }

  /** Unified material getter for NAAC reporting */
  async getAllWorkshopMaterials(workshopId: string) {
    const wId = this.toObjectId(workshopId);
    
    // 1. Get static curriculum materials from the workshop document
    const workshop = await this.workshopModel.findById(wId);
    const staticMaterials = (workshop?.content || []).flatMap(section => section.materials || []);
    this.logger.log(`Workshop ${wId} found: ${!!workshop}. Static mats: ${staticMaterials.length}`);

    // 2. Get dynamic educator-uploaded session materials
    const dynamicMaterials = await this.teacherContentModel.find({ workshopId: wId }).exec();
    this.logger.log(`Dynamic educator mats found: ${dynamicMaterials.length}`);

    // 3. Get materials from AI-generated curriculum sessions
    const aiSessions = await this.sessionModel.find({ 
      $or: [
        { workshopId: wId },
        { workshopId: workshopId }
      ]
    }).exec();
    this.logger.log(`Querying Sessions for workshopId: ${workshopId}. Found: ${aiSessions.length}`);
    if (aiSessions.length === 0) {
        const sample = await this.sessionModel.findOne().exec();
        this.logger.log(`DEBUG: Sample Session from DB workshopId type: ${typeof sample?.workshopId}. Value: ${sample?.workshopId}`);
    }
    const aiSessionMaterials = aiSessions.flatMap(s => s.materials || []);
    this.logger.log(`AI Curriculum sessions found: ${aiSessions.length}. AI mats: ${aiSessionMaterials.length}`);

    // 4. Merge and return
    return [
      ...staticMaterials.map(m => ({ title: m.title, url: m.url, type: m.type })),
      ...dynamicMaterials.map(m => ({ title: m.title, url: m.url, type: m.type })),
      ...aiSessionMaterials.map(m => ({ title: m.title, url: m.url, type: m.type }))
    ];
  }
}
