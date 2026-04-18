import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { College, CollegeDocument } from './college.schema';
import { UsersService } from '../users/users.service';
import { User, UserDocument, UserRole } from '../users/user.schema';
import { Workshop, WorkshopDocument } from '../workshops/workshop.schema';
import { Attendance, AttendanceDocument } from '../workshops/attendance.schema';
import { Division, DivisionDocument } from '../divisions/division.schema';
import { Assignment, AssignmentDocument } from '../assignments/assignment.schema';
import { Submission, SubmissionDocument } from '../assignments/submission.schema';
import { Classroom, ClassroomDocument } from '../classrooms/classroom.schema';

@Injectable()
export class CollegesService {
  private readonly logger = new Logger(CollegesService.name);

  constructor(
    @InjectModel(College.name) private collegeModel: Model<CollegeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Division.name) private divisionModel: Model<DivisionDocument>,
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Classroom.name) private classroomModel: Model<ClassroomDocument>,
    private usersService: UsersService,
  ) {}

  async create(createCollegeDto: any): Promise<CollegeDocument> {
    const { name, adminEmail, adminName, adminPassword, adminPhone, ...rest } = createCollegeDto;
    this.logger.log(`Creating college: ${name}`);
    const college = new this.collegeModel({ name, ...rest });
    const savedCollege = await college.save();
    try {
      const admin = await this.usersService.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: UserRole.COLLEGE_ADMIN,
        collegeId: savedCollege._id,
      });
      savedCollege.adminId = admin._id;
      await savedCollege.save();
      this.logger.log(`College and admin created successfully: ${name}`);
    } catch (error) {
      this.logger.error(`Failed to create admin for college ${name}. Rolling back college creation.`, error.stack);
      await this.collegeModel.findByIdAndDelete(savedCollege._id);
      throw error;
    }
    return savedCollege;
  }

  async findAll(): Promise<CollegeDocument[]> {
    return this.collegeModel.find().populate('adminId', 'name email').exec();
  }

  async findOne(id: string): Promise<CollegeDocument> {
    const college = await this.collegeModel.findById(id).populate('adminId', 'name email').exec();
    if (!college) {
      this.logger.warn(`College not found: ${id}`);
      throw new NotFoundException('College not found');
    }
    return college;
  }

  async update(id: string, updateData: any): Promise<CollegeDocument | null> {
    this.logger.log(`Updating college: ${id}`);
    const college = await this.collegeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate('adminId', 'name email').exec();
    if (!college) {
      throw new NotFoundException('College not found');
    }
    return college;
  }

  async getPlatformStats() {
    this.logger.log('Fetching platform-wide statistics');
    const [totalColleges, totalUsers, totalWorkshops, activeSessions] = await Promise.all([
      this.collegeModel.countDocuments(),
      this.userModel.countDocuments(),
      this.workshopModel.countDocuments(),
      this.workshopModel.countDocuments({ status: 'ONGOING' }),
    ]);

    return { totalColleges, totalUsers, totalWorkshops, activeSessions };
  }

  async getCollegeStats(collegeId: string | Types.ObjectId) {
    const cId = collegeId instanceof Types.ObjectId ? collegeId : new Types.ObjectId(collegeId);
    this.logger.log(`Fetching statistics for college: ${cId}`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [totalStudents, totalWorkshops, liveWorkshops, activeStudents, workshops] = await Promise.all([
      this.userModel.countDocuments({ collegeId: cId, role: UserRole.STUDENT }),
      this.workshopModel.countDocuments({ collegeId: cId }),
      this.workshopModel.countDocuments({ collegeId: cId, status: 'ONGOING' }),
      this.attendanceModel.distinct('studentId', { 
        createdAt: { $gte: oneHourAgo } 
      }).then(ids => ids.length),
      this.workshopModel.find({ collegeId: cId }).select('schedule').exec(),
    ]);

    // Calculate actual average session time
    const avgTime = workshops.length > 0 
      ? Math.round(workshops.reduce((acc, w) => acc + (w.schedule.end.getTime() - w.schedule.start.getTime()), 0) / workshops.length / 60000)
      : 0;

    return {
      totalStudents,
      totalWorkshops,
      liveWorkshops,
      activeClassrooms: liveWorkshops,
      activeStudents,
      avgSessionTime: `${avgTime}m`,
    };
  }

  async getInstructorStats(instructorId: string, collegeId: string) {
    const iId = new Types.ObjectId(instructorId);
    const cId = new Types.ObjectId(collegeId);
    this.logger.log(`Fetching instructor stats for: ${iId} in college: ${cId}`);
    
    const [myWorkshops, ongoingWorkshops] = await Promise.all([
      this.workshopModel.countDocuments({ instructorId: iId }),
      this.workshopModel.countDocuments({ instructorId: iId, status: 'ONGOING' }),
    ]);

    return {
      totalWorkshops: myWorkshops,
      liveWorkshops: ongoingWorkshops,
      averageParticipation: "88%", // TODO: Implement actual participation calculation
    };
  }

  async update(id: string, updateCollegeDto: any): Promise<CollegeDocument> {
    const { adminName, adminEmail, adminPassword, name, status } = updateCollegeDto;
    this.logger.log(`Updating college: ${id}`);
    
    const college = await this.collegeModel.findById(id).exec();
    if (!college) {
      throw new NotFoundException(`College with ID ${id} not found`);
    }

    // Update college fields
    if (name) college.name = name;
    if (status) college.status = status;
    await college.save();

    // Update admin if fields provided
    if (college.adminId && (adminName || adminEmail || adminPassword)) {
      const updateData: any = {};
      if (adminName) updateData.name = adminName;
      if (adminEmail) updateData.email = adminEmail;
      if (adminPassword) updateData.password = adminPassword;
      await this.usersService.update(college.adminId, updateData);
    }

    return college.populate('adminId', 'name email');
  }

  async remove(id: string): Promise<any> {
    const cId = new Types.ObjectId(id);
    this.logger.log(`INITIATING CASCADING DELETE for college: ${cId}`);
    
    const college = await this.collegeModel.findById(cId).exec();
    if (!college) {
      throw new NotFoundException(`College with ID ${id} not found`);
    }

    // 1. Find all identifiers for cascading
    const [userIds, workshopIds] = await Promise.all([
      this.userModel.find({ collegeId: cId }).distinct('_id'),
      this.workshopModel.find({ collegeId: cId }).distinct('_id'),
    ]);

    this.logger.log(`Cleaning up ${userIds.length} users and ${workshopIds.length} workshops...`);

    // 2. Perform parallel deletions of dependent data
    await Promise.all([
      // Cleanup by student IDs
      this.submissionModel.deleteMany({ studentId: { $in: userIds } }),
      
      // Cleanup by workshop IDs
      this.assignmentModel.deleteMany({ workshopId: { $in: workshopIds } }),
      this.attendanceModel.deleteMany({ workshopId: { $in: workshopIds } }),
      this.classroomModel.deleteMany({ workshopId: { $in: workshopIds } }),
      
      // Cleanup by college ID directly
      this.divisionModel.deleteMany({ collegeId: cId }),
    ]);

    // 3. Final cleanup of core entities
    await Promise.all([
      this.workshopModel.deleteMany({ collegeId: cId }),
      this.userModel.deleteMany({ collegeId: cId }),
    ]);

    // 4. Delete the college itself
    await this.collegeModel.findByIdAndDelete(cId).exec();

    this.logger.log(`Successfully purged all data for institution: ${college.name}`);
    return { message: 'Institutional data purged successfully' };
  }
}
