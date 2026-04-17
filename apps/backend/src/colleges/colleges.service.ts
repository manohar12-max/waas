import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { College, CollegeDocument } from './college.schema';
import { UsersService } from '../users/users.service';
import { User, UserDocument, UserRole } from '../users/user.schema';
import { Workshop, WorkshopDocument } from '../workshops/workshop.schema';
import { Attendance, AttendanceDocument } from '../workshops/attendance.schema';

@Injectable()
export class CollegesService {
  constructor(
    @InjectModel(College.name) private collegeModel: Model<CollegeDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Workshop.name) private workshopModel: Model<WorkshopDocument>,
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
    private usersService: UsersService,
  ) {}

  async create(createCollegeDto: any): Promise<CollegeDocument> {
    const { name, adminEmail, adminName, adminPassword, ...rest } = createCollegeDto;
    const college = new this.collegeModel({ name, ...rest });
    const savedCollege = await college.save();
    try {
      const admin = await this.usersService.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: UserRole.COLLEGE_ADMIN,
        collegeId: savedCollege._id,
      });
      savedCollege.adminId = admin._id;
      await savedCollege.save();
    } catch (error) {
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
    if (!college) throw new NotFoundException('College not found');
    return college;
  }



  async getPlatformStats() {
    const [totalColleges, totalUsers, totalWorkshops, activeSessions] = await Promise.all([
      this.collegeModel.countDocuments(),
      this.userModel.countDocuments(),
      this.workshopModel.countDocuments(),
      this.workshopModel.countDocuments({ status: 'ONGOING' }),
    ]);

    return { totalColleges, totalUsers, totalWorkshops, activeSessions };
  }

  async getCollegeStats(collegeId: any) {
    const cId = collegeId instanceof Types.ObjectId ? collegeId : new Types.ObjectId(collegeId);
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

  async getInstructorStats(instructorId: any, collegeId: any) {
    const iId = new Types.ObjectId(instructorId);
    const cId = new Types.ObjectId(collegeId);
    
    const [myWorkshops, ongoingWorkshops] = await Promise.all([
      this.workshopModel.countDocuments({ instructorId: iId }),
      this.workshopModel.countDocuments({ instructorId: iId, status: 'ONGOING' }),
    ]);

    return {
      totalWorkshops: myWorkshops,
      liveWorkshops: ongoingWorkshops,
      averageParticipation: "88%", // Placeholder for next engagement patch
    };
  }
}
