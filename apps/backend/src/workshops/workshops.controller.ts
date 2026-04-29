import {
  Controller, Get, Post, Body, UseGuards, Delete, Param, Patch,
  UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { WorkshopsService } from './workshops.service';
import { GetUser } from '../auth/get-user.decorator';
import { Public } from '../auth/public.decorator';

@Controller('workshops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) { }

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const url = await this.workshopsService.uploadToCloudinary(file);
    return { url };
  }

  @Public()
  @Get('validate-invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.workshopsService.validateInvite(token);
  }

  // Restricted manual enrollment/creation by Teachers/Admins
  @Post(':id/students')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  createStudent(
    @Param('id') workshopId: string,
    @Body() studentData: any,
    @GetUser('collegeId') collegeId: string
  ) {
    return this.workshopsService.createStudentForWorkshop(workshopId, studentData, collegeId);
  }

  @Post(':id/bulk-students')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  bulkCreateStudents(
    @Param('id') workshopId: string,
    @Body('students') students: any[],
    @GetUser('collegeId') collegeId: string
  ) {
    return this.workshopsService.bulkCreateStudentsForWorkshop(workshopId, students, collegeId);
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  deleteStudent(
    @Param('id') workshopId: string,
    @Param('studentId') studentId: string
  ) {
    return this.workshopsService.deleteStudentCompletely(workshopId, studentId);
  }

  @Post(':id/approve-student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  approveStudent(
    @Param('id') workshopId: string,
    @Param('studentId') studentId: string
  ) {
    return this.workshopsService.approveStudent(workshopId, studentId);
  }

  @Post(':id/bulk-approve')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  bulkApprove(
    @Param('id') workshopId: string,
    @Body('studentIds') studentIds: string[]
  ) {
    return this.workshopsService.bulkApproveStudents(workshopId, studentIds);
  }

  @Post(':id/reject-student/:studentId')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  rejectStudent(
    @Param('id') workshopId: string,
    @Param('studentId') studentId: string
  ) {
    return this.workshopsService.rejectStudent(workshopId, studentId);
  }

  @Post(':id/bulk-reject')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  bulkReject(
    @Param('id') workshopId: string,
    @Body('studentIds') studentIds: string[]
  ) {
    return this.workshopsService.bulkRejectStudents(workshopId, studentIds);
  }

  @Public()
  @Post('enroll')
  enrollStudent(@Body() enrollDto: any) {
    return this.workshopsService.enrollStudent(enrollDto);
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  create(
    @Body() createWorkshopDto: any, 
    @GetUser('collegeId') collegeId: string,
    @GetUser('_id') userId: string,
    @GetUser('role') role: string
  ) {
    if (role === UserRole.INSTRUCTOR) {
      createWorkshopDto.instructorId = userId;
    }
    return this.workshopsService.create(createWorkshopDto, collegeId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT)
  findAll(
    @GetUser('collegeId') collegeId: string,
    @GetUser('role') role: string,
    @GetUser('_id') userId: string
  ) {
    const instructorId = role === UserRole.INSTRUCTOR ? userId : undefined;
    const studentId = role === UserRole.STUDENT ? userId : undefined;
    return this.workshopsService.findAll(collegeId, instructorId, studentId);
  }

  /** Super Admin: get all workshops for a specific college */
  @Get('by-college/:collegeId')
  @Roles(UserRole.SUPER_ADMIN)
  findByCollege(@Param('collegeId') collegeId: string) {
    return this.workshopsService.findAllByCollegeId(collegeId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT)
  findOne(
    @Param('id') id: string,
    @GetUser('collegeId') collegeId: string,
    @GetUser('_id') userId: string,
    @GetUser('role') role: string
  ) {
    return this.workshopsService.findOne(id, collegeId, userId, role);
  }

  @Patch(':id/status')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @GetUser('collegeId') collegeId: string
  ) {
    return this.workshopsService.updateStatus(id, status, collegeId);
  }

  // --- Smart Attendance API (Prompt 4) ---

  @Post(':id/attendance')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.COLLEGE_ADMIN, UserRole.STUDENT)
  recordAttendance(
    @Param('id') workshopId: string,
    @Body('studentId') studentId: string,
    @Body('method') method: string,
    @GetUser('_id') verifiedBy: string
  ) {
    return this.workshopsService.recordAttendance(workshopId, studentId, verifiedBy, method);
  }

  @Patch(':id/attendance/:attendanceId')
  @Roles(UserRole.TEACHER, UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  overrideAttendance(
    @Param('attendanceId') attendanceId: string,
    @Body('status') status: string,
    @GetUser('_id') teacherId: string
  ) {
    return this.workshopsService.overrideAttendance(attendanceId, status, teacherId);
  }

  @Get(':id/attendance')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  getAttendance(@Param('id') workshopId: string) {
    return this.workshopsService.getAttendanceForWorkshop(workshopId);
  }

  @Get(':id/my-attendance')
  @Roles(UserRole.STUDENT)
  getMyAttendance(@Param('id') wId: string, @GetUser('_id') sId: string) {
    return this.workshopsService.getStudentAttendance(wId, sId);
  }

  @Delete(':id/attendance/:studentId')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  unmarkAttendance(
    @Param('id') workshopId: string,
    @Param('studentId') studentId: string
  ) {
    return this.workshopsService.unmarkAttendance(workshopId, studentId);
  }

  @Patch(':id')
  @Roles(UserRole.INSTRUCTOR)
  update(
    @Param('id') id: string,
    @Body() updateWorkshopDto: any,
    @GetUser('collegeId') collegeId: string
  ) {
    // Basic security: Ensure the workshop belongs to the same college
    return this.workshopsService.update(id, updateWorkshopDto, collegeId);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  remove(
    @Param('id') id: string, 
    @GetUser('collegeId') collegeId: string,
    @GetUser('role') role: string,
    @GetUser('_id') userId: string
  ) {
    const instructorId = role === UserRole.INSTRUCTOR ? userId : undefined;
    return this.workshopsService.remove(id, collegeId, instructorId);
  }

  @Patch(':id/active')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean, @GetUser('collegeId') collegeId: string) {
    return this.workshopsService.update(id, { isActive }, collegeId);
  }
}
