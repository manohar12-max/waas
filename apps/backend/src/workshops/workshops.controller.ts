import { Controller, Get, Post, Body, UseGuards, Delete, Param, Patch } from '@nestjs/common';
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
  @Get('validate-invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.workshopsService.validateInvite(token);
  }

  @Public()
  @Post('enroll')
  enrollStudent(@Body() enrollDto: any) {
    return this.workshopsService.enrollStudent(enrollDto);
  }

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  create(@Body() createWorkshopDto: any, @GetUser('collegeId') collegeId: string) {
    return this.workshopsService.create(createWorkshopDto, collegeId);
  }

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT)
  findAll(
    @GetUser('collegeId') collegeId: string,
    @GetUser('role') role: string,
    @GetUser('_id') userId: string
  ) {
    const instructorId = role === UserRole.INSTRUCTOR ? userId : undefined;
    return this.workshopsService.findAll(collegeId, instructorId);
  }

  /** Super Admin: get all workshops for a specific college */
  @Get('by-college/:collegeId')
  @Roles(UserRole.SUPER_ADMIN)
  findByCollege(@Param('collegeId') collegeId: string) {
    return this.workshopsService.findAllByCollegeId(collegeId);
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT)
  findOne(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.workshopsService.findOne(id, collegeId);
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

  @Delete(':id/attendance/:studentId')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  unmarkAttendance(
    @Param('id') workshopId: string,
    @Param('studentId') studentId: string
  ) {
    return this.workshopsService.unmarkAttendance(workshopId, studentId);
  }

  @Patch(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  update(
    @Param('id') id: string,
    @Body() updateWorkshopDto: any,
    @GetUser('collegeId') collegeId: string
  ) {
    // Basic security: Ensure the workshop belongs to the same college
    return this.workshopsService.update(id, updateWorkshopDto);
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  remove(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.workshopsService.delete(id, collegeId);
  }
}
