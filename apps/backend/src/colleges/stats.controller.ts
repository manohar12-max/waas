import { Controller, Get, UseGuards } from '@nestjs/common';
import { CollegesService } from './colleges.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly collegesService: CollegesService) {}

  @Get('platform')
  @Roles(UserRole.SUPER_ADMIN)
  async getPlatformStats() {
    return this.collegesService.getPlatformStats();
  }

  @Get('college')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.TEACHER, UserRole.INSTRUCTOR)
  async getCollegeStats(@GetUser('collegeId') collegeId: string) {
    return this.collegesService.getCollegeStats(collegeId);
  }

  @Get('instructor')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER)
  async getInstructorStats(
    @GetUser('_id') userId: string,
    @GetUser('collegeId') collegeId: string
  ) {
    return this.collegesService.getInstructorStats(userId, collegeId);
  }
}
