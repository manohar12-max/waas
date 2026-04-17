import { Controller, Get, Post, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';
import { DivisionsService } from '../divisions/divisions.service';
import { WorkshopsService } from '../workshops/workshops.service';

@Controller('teacher')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherController {
  constructor(
    private readonly divisionsService: DivisionsService,
    private readonly workshopsService: WorkshopsService,
  ) {}

  @Get('divisions')
  async getMyDivisions(@GetUser('id') teacherId: string) {
    return this.divisionsService.findByTeacher(teacherId);
  }

  @Post('assignments')
  async createAssignment(@Body() assignmentDto: any, @GetUser('id') teacherId: string) {
    // Logic for creating assignments...
    return { success: true, message: 'Assignment created successfully' };
  }

  @Patch('attendance/:id')
  async overrideAttendance(@Param('id') id: string, @Body('status') status: string, @GetUser('id') teacherId: string) {
    return this.workshopsService.overrideAttendance(id, status, teacherId);
  }

  @Get('divisions/:id/analytics')
  async getAnalytics(@Param('id') id: string) {
    return this.divisionsService.getStats(id);
  }
}
