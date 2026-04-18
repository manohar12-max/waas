import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';
import { WorkshopsService } from './workshops.service';

@Controller('learning-content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LearningContentController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  async createContent(
    @Body() createDto: any,
    @GetUser('id') teacherId: string,
  ) {
    return this.workshopsService.createTeacherContent(createDto, teacherId);
  }

  @Get('personal')
  @Roles(UserRole.TEACHER)
  async getPersonal(@GetUser('id') teacherId: string) {
    return this.workshopsService.getPersonalContent(teacherId);
  }

  @Get('aggregated/:workshopId')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT)
  async getAggregated(
    @Param('workshopId') workshopId: string,
    @Query('divisionId') divisionId?: string,
  ) {
    return this.workshopsService.getAggregatedContent(workshopId, divisionId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async deleteContent(@Param('id') id: string) {
    return this.workshopsService.deleteTeacherContent(id);
  }

  @Post(':id')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR)
  async updateContent(@Param('id') id: string, @Body() updateDto: any) {
    return this.workshopsService.updateTeacherContent(id, updateDto);
  }
}
