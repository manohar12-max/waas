import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { ClassroomsService } from './classrooms.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN)
  create(@Body() createClassroomDto: any, @GetUser('collegeId') collegeId: string) {
    return this.classroomsService.create(createClassroomDto, collegeId);
  }

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.TEACHER)
  findAll(@GetUser('collegeId') collegeId: string) {
    return this.classroomsService.findAll(collegeId);
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN)
  remove(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.classroomsService.delete(id, collegeId);
  }
}
