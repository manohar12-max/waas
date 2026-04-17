import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v2 as cloudinary } from 'cloudinary';
import { Workshop, WorkshopDocument } from './workshop.schema';
import { Attendance, AttendanceDocument } from './attendance.schema';
import { User, UserDocument, UserRole } from '../users/user.schema';
import { WorkshopMediaPost, WorkshopMediaPostDocument } from './media-post.schema';
import { TeacherContent, TeacherContentDocument } from './teacher-content.schema';

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(WorkshopMediaPost.name) private mediaPostModel: Model<WorkshopMediaPostDocument>,
    @InjectModel(TeacherContent.name) private teacherContentModel: Model<TeacherContentDocument>,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async enrollStudent(enrollDto: any) {
    const { inviteToken, name, email, phone } = enrollDto;

    // 1. Validate Invite
    const workshop = await this.workshopModel.findOne({ inviteToken });
    if (!workshop) throw new NotFoundException('Invalid institutional link.');

    // 2. Check Existence
    const existing = await this.userModel.findOne({ email });
    if (existing) throw new ConflictException('Identity already registered.');

    // 3. Create Identity (Zero-Friction)
    const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const student = new this.userModel({
      name,
      email,
      phone,
      password: hashedPassword,
      role: UserRole.STUDENT,
      collegeId: workshop.collegeId,
      active: true
    });

    const savedStudent = await student.save();

    // 4. Link to Workshop
    await this.workshopModel.findByIdAndUpdate(workshop._id, {
      $addToSet: { registeredStudentIds: savedStudent._id }
    });

    return {
      success: true,
      workshop: workshop.title,
      student: savedStudent.name
    };
  }

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
      this.logger.error(`Database Error during workshop deployment: ${err.message}`);
      throw new BadRequestException('Institutional database rejected the workshop record.');
    }
  }

  async validateInvite(token: string) {
    const workshop = await this.workshopModel.findOne({ inviteToken: token })
      .populate('collegeId', 'name')
      .populate('instructorId', 'name email')
      .exec();

    if (!workshop) {
      throw new NotFoundException('Invalid or expired invitation link.');
    }

    return workshop;
  }

  async findAll(collegeId: any, instructorId?: any): Promise<WorkshopDocument[]> {
    try {
      const cId = this.toObjectId(collegeId);
      if (!cId) return [];

      const query: any = { collegeId: cId };
      if (instructorId) {
        const iId = this.toObjectId(instructorId);
        if (iId) query.instructorId = iId;
      }

      return this.workshopModel
        .find(query)
        .populate('instructorId', 'name email')
        .sort({ 'schedule.start': 1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to fetch workshops: ${error.message}`);
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
      this.logger.error(`Failed to fetch instructor workshops: ${error.message}`);
      return [];
    }
  }

  async update(id: any, updateDto: any): Promise<WorkshopDocument | null> {
    const wId = this.toObjectId(id);
    if (!wId) throw new BadRequestException('Invalid Workshop ID.');

    return this.workshopModel.findByIdAndUpdate(
      wId,
      { $set: updateDto },
      { new: true }
    ).exec();
  }

  async findOne(id: any, collegeId: any): Promise<WorkshopDocument | null> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId || !cId) throw new NotFoundException('Workshop not found or institutional access denied.');

    const workshop = await this.workshopModel.findOne({
      _id: wId,
      collegeId: cId,
    })
      .populate('instructorId', 'name email')
      .populate('registeredStudentIds', 'name email createdAt')
      .exec();

    if (!workshop) throw new NotFoundException('Workshop resource deleted or moved.');
    return workshop;
  }

  async registerStudent(inviteToken: string, studentId: any) {
    const sId = this.toObjectId(studentId);
    if (!sId) return null;

    return this.workshopModel.findOneAndUpdate(
      { inviteToken },
      { $addToSet: { registeredStudentIds: sId } },
      { new: true }
    ).exec();
  }

  async delete(id: any, collegeId: any): Promise<any> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId || !cId) return null;

    return this.workshopModel.findOneAndDelete({
      _id: wId,
      collegeId: cId,
    }).exec();
  }

  async updateStatus(id: any, status: string, collegeId: any): Promise<any> {
    const wId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!wId || !cId) throw new BadRequestException('Status update failed: Identity mismatch.');

    return this.workshopModel.findOneAndUpdate(
      { _id: wId, collegeId: cId },
      { $set: { status } },
      { new: true }
    ).exec();
  }

  async recordAttendance(workshopId: any, studentId: any, verifiedBy: any, method: string): Promise<any> {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    const vId = this.toObjectId(verifiedBy);

    if (!wId || !sId || !vId) throw new BadRequestException('Attendance recording failed: Reference ID corruption.');

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

    // 1. Find Student
    const student = await this.userModel.findOne({ email, role: UserRole.STUDENT });
    if (!student) throw new NotFoundException('Student identity not found in institutional records.');

    // 2. Verify Registration
    const isRegistered = await this.workshopModel.findOne({
      _id: wId,
      registeredStudentIds: student._id
    });
    if (!isRegistered) throw new BadRequestException('You are not registered for this curriculum session.');

    // 3. Mark Present (Self-Checkin)
    // For self-checkin, verifiedBy can be the student themselves or a system ID. 
    // We'll use the student identity as the verifier for self-checkin.
    return this.recordAttendance(wId, student._id, student._id, 'QR_SCAN');
  }

  async unmarkAttendance(workshopId: any, studentId: any): Promise<any> {
    const wId = this.toObjectId(workshopId);
    const sId = this.toObjectId(studentId);
    if (!wId || !sId) throw new BadRequestException('Reference ID mismatch.');

    return this.attendanceModel.findOneAndDelete({ workshopId: wId, studentId: sId }).exec();
  }

  async overrideAttendance(id: any, status: string, teacherId: any): Promise<any> {
    const aId = this.toObjectId(id);
    const tId = this.toObjectId(teacherId);

    if (!aId || !tId) throw new BadRequestException('Attendance override failed: Identity context missing.');

    return this.attendanceModel.findOneAndUpdate(
      { _id: aId },
      { $set: { status, verifiedBy: tId } },
      { new: true }
    ).exec();
  }

  async getAttendanceForWorkshop(workshopId: any): Promise<any[]> {
    const wId = this.toObjectId(workshopId);
    if (!wId) return [];

    return this.attendanceModel
      .find({ workshopId: wId })
      .populate('studentId', 'name email phone') // Include phone for registration hall
      .exec();
  }

  // --- Media Feed Methods ---
  async createMediaPost(createDto: any, teacherId: string): Promise<WorkshopMediaPostDocument> {
    const post = new this.mediaPostModel({
      ...createDto,
      workshopId: this.toObjectId(createDto.workshopId),
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

  // --- Teacher Content Methods ---
  async createTeacherContent(createDto: any, teacherId: string): Promise<TeacherContentDocument> {
    const { shareToMediaFeed, ...data } = createDto;
    
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
            await this.createMediaPost({
                workshopId: data.workshopId,
                mediaType: data.type,
                mediaUrl: data.url,
                caption: data.title,
                description: data.description
            }, teacherId);
        } catch (err) {
            console.error('Mirroring to Media Feed Failed', err);
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
    // Example: https://res.cloudinary.com/dbqxje2nu/image/upload/v1713330000/public_id.jpg
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1]; // public_id.jpg
    return lastPart.split('.')[0]; // public_id
  }

  async deleteMediaPost(id: string): Promise<any> {
    const post = await this.mediaPostModel.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    
    try {
      const publicId = this.extractPublicId(post.mediaUrl);
      const resourceType = post.mediaUrl.match(/\.(mp4|webm|ogg|mov)$|^.*video\/upload.*$/) ? 'video' : 'image';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.error('Cloudinary Delete Failed', err);
    }
    
    return this.mediaPostModel.findByIdAndDelete(id);
  }

  async deleteTeacherContent(id: string): Promise<any> {
    const content = await this.teacherContentModel.findById(id);
    if (!content) throw new NotFoundException('Content not found');
    
    try {
      if (content.type !== 'LINK') {
        const publicId = this.extractPublicId(content.url);
        const resourceType = content.type === 'VIDEO' ? 'video' : content.type === 'PDF' ? 'raw' : 'image';
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      }
    } catch (err) {
      console.error('Cloudinary Delete Failed', err);
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
}
