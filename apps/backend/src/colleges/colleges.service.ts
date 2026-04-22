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

  async getPlatformStats() {
    this.logger.log('Fetching platform-wide statistics');
    const [totalColleges, totalUsers, totalWorkshops, activeSessions,
      recentColleges, recentUsers, recentWorkshops, roleCounts, growthData] = await Promise.all([
      this.collegeModel.countDocuments(),
      this.userModel.countDocuments(),
      this.workshopModel.countDocuments(),
      this.workshopModel.countDocuments({ status: 'ACTIVE' }),
      // Recent activity sources
      this.collegeModel.find().sort({ createdAt: -1 }).limit(3).select('name createdAt').lean(),
      this.userModel.find({ role: { $ne: 'SUPER_ADMIN' } }).sort({ createdAt: -1 }).limit(4)
        .populate('collegeId', 'name').select('name role createdAt collegeId').lean(),
      this.workshopModel.find().sort({ createdAt: -1 }).limit(3)
        .populate('collegeId', 'name').select('title status createdAt collegeId').lean(),
      // Role distribution for Pie Chart
      this.userModel.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      // College growth for Area/Line Chart (last 6 months)
      this.collegeModel.aggregate([
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 6 }
      ])
    ]);

    // Build role distribution object
    const roleDistribution = roleCounts.map(r => ({ name: r._id, value: r.count }));

    // Build growth trend
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const collegeGrowth = growthData.map(g => ({
      name: `${monthNames[g._id.month - 1]} ${g._id.year}`,
      colleges: g.count
    }));

    // Build a unified activity feed sorted by time
    const activities: any[] = [
      ...recentColleges.map((c: any) => ({
        type: 'college',
        icon: 'building',
        label: `New institution onboarded — ${c.name}`,
        time: c.createdAt,
      })),
      ...recentUsers.map((u: any) => ({
        type: 'user',
        icon: 'user',
        label: `${u.role === 'COLLEGE_ADMIN' ? 'College admin' : u.role.charAt(0) + u.role.slice(1).toLowerCase()} joined — ${u.name}`,
        sub: (u.collegeId as any)?.name || 'Platform',
        time: u.createdAt,
      })),
      ...recentWorkshops.map((w: any) => ({
        type: 'workshop',
        icon: 'book',
        label: `Workshop created — ${w.title}`,
        sub: (w.collegeId as any)?.name || '',
        time: w.createdAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    return { totalColleges, totalUsers, totalWorkshops, activeSessions, recentActivity: activities, roleDistribution, collegeGrowth };
  }

  async getCollegeStats(collegeId: string | Types.ObjectId) {
    const cId = collegeId instanceof Types.ObjectId ? collegeId : new Types.ObjectId(collegeId);
    this.logger.log(`Fetching statistics for college: ${cId}`);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [totalStudents, totalWorkshops, liveWorkshops, activeStudents, workshops,
      recentStudents, recentWorkshops, recentSubmissions, workshopStatus, attendanceTrend] = await Promise.all([
      this.userModel.countDocuments({ collegeId: cId, role: UserRole.STUDENT }),
      this.workshopModel.countDocuments({ collegeId: cId }),
      this.workshopModel.countDocuments({ collegeId: cId, status: 'ACTIVE' }),
      this.attendanceModel.distinct('studentId', { createdAt: { $gte: oneHourAgo } }).then(ids => ids.length),
      this.workshopModel.find({ collegeId: cId }).select('schedule').exec(),
      // Recent activity
      this.userModel.find({ collegeId: cId, role: UserRole.STUDENT }).sort({ createdAt: -1 }).limit(3).select('name createdAt').lean(),
      this.workshopModel.find({ collegeId: cId }).sort({ createdAt: -1 }).limit(3).select('title status createdAt').lean(),
      this.submissionModel.find().sort({ createdAt: -1 }).limit(3)
        .populate({ path: 'assignmentId', match: { workshopId: { $exists: true } }, select: 'title' })
        .populate('studentId', 'name').select('createdAt status').lean(),
      // Workshop distribution
      this.workshopModel.aggregate([
        { $match: { collegeId: cId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Attendance trend last 7 days
      this.attendanceModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const avgTime = workshops.length > 0 
      ? Math.round(workshops.reduce((acc, w) => acc + (w.schedule.end.getTime() - w.schedule.start.getTime()), 0) / workshops.length / 60000)
      : 0;

    const workshopStatusDistribution = workshopStatus.map(s => ({ name: s._id, value: s.count }));
    const formattedAttendanceTrend = attendanceTrend.map(a => ({ name: a._id, value: a.count }));

    const activities: any[] = [
      ...recentStudents.map((u: any) => ({
        type: 'user', icon: 'user',
        label: `New student enrolled — ${u.name}`,
        time: u.createdAt,
      })),
      ...recentWorkshops.map((w: any) => ({
        type: 'workshop', icon: 'book',
        label: `Workshop ${w.status === 'ACTIVE' ? 'started' : 'created'} — ${w.title}`,
        time: w.createdAt,
      })),
      ...recentSubmissions
        .filter((s: any) => s.assignmentId && s.studentId)
        .map((s: any) => ({
          type: 'submission', icon: 'check',
          label: `Assignment submitted by ${(s.studentId as any)?.name || 'Student'}`,
          sub: (s.assignmentId as any)?.title || '',
          time: s.createdAt,
        })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);

    return {
      totalStudents, totalWorkshops, liveWorkshops,
      activeClassrooms: liveWorkshops,
      activeStudents, avgSessionTime: `${avgTime}m`,
      recentActivity: activities,
      workshopStatusDistribution,
      attendanceTrend: formattedAttendanceTrend
    };
  }

  async getInstructorStats(instructorId: string, collegeId: string) {
    const iId = new Types.ObjectId(instructorId);
    const cId = new Types.ObjectId(collegeId);
    this.logger.log(`Fetching instructor stats for: ${iId} in college: ${cId}`);
    
    const [myWorkshops, ongoingWorkshops, assignmentStats, studentDistribution] = await Promise.all([
      this.workshopModel.countDocuments({ instructorId: iId }),
      this.workshopModel.countDocuments({ instructorId: iId, status: 'ACTIVE' }),
      this.assignmentModel.aggregate([
        { $match: { teacherId: iId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.workshopModel.aggregate([
        { $match: { instructorId: iId } },
        { $project: { title: 1, studentCount: { $size: '$registeredStudentIds' } } }
      ])
    ]);

    return {
      totalWorkshops: myWorkshops,
      liveWorkshops: ongoingWorkshops,
      averageParticipation: "88%",
      assignmentStats: assignmentStats.map(a => ({ name: a._id, value: a.count })),
      studentDistribution: studentDistribution.map(s => ({ name: s.title, value: s.studentCount }))
    };
  }

  async getStudentStats(studentId: string) {
    const sId = new Types.ObjectId(studentId);
    this.logger.log(`Fetching student stats for: ${sId}`);

    const [attendanceCount, totalWorkshops, assignmentStats, recentSubmissions] = await Promise.all([
      this.attendanceModel.countDocuments({ studentId: sId }),
      this.workshopModel.countDocuments({ registeredStudentIds: sId }),
      this.submissionModel.aggregate([
        { $match: { studentId: sId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.submissionModel.find({ studentId: sId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('assignmentId', 'title')
        .lean()
    ]);

    // Calculate attendance percentage (mocking total sessions for now)
    const attendanceRate = totalWorkshops > 0 ? Math.round((attendanceCount / (totalWorkshops * 5)) * 100) : 0;

    return {
      attendanceRate: `${attendanceRate}%`,
      totalWorkshops,
      assignments: assignmentStats.map(a => ({ name: a._id, value: a.count })),
      recentPerformance: recentSubmissions.map((s: any) => ({
        name: s.assignmentId?.title || 'Assignment',
        score: s.marks || 0
      }))
    };
  }

  async update(id: string, updateCollegeDto: any): Promise<CollegeDocument> {
    const { adminName, adminEmail, adminPassword, adminPhone, name, status } = updateCollegeDto;
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
    if (college.adminId && (adminName || adminEmail || adminPassword || adminPhone)) {
      const updateData: any = {};
      if (adminName) updateData.name = adminName;
      if (adminEmail) updateData.email = adminEmail;
      if (adminPassword) updateData.password = adminPassword;
      if (adminPhone) updateData.phone = adminPhone;
      await this.usersService.update(college.adminId, updateData);
    }

    return college.populate('adminId', 'name email phone');
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
