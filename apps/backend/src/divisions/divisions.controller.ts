import { Controller, Get, Post, Body, UseGuards, Delete, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { DivisionsService } from './divisions.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('divisions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  @Post()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  create(@Body() createDivisionDto: any, @GetUser('role') role: string, @GetUser('collegeId') collegeId: string) {
    // Note: Cross-module validation (ownership) is handled in the specialized InstructorController
    // if the endpoint /instructor/divisions is used.
    return this.divisionsService.create(createDivisionDto, collegeId);
  }

  @Get()
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR, UserRole.TEACHER)
  findAll(@GetUser('collegeId') collegeId: string) {
    return this.divisionsService.findAll(collegeId);
  }

  @Get(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR, UserRole.TEACHER)
  findOne(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.divisionsService.findOne(id, collegeId);
  }

  @Get('workshop/:workshopId')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR, UserRole.TEACHER)
  findByWorkshop(@Param('workshopId') workshopId: string) {
    return this.divisionsService.findByWorkshop(workshopId);
  }

  @Delete(':id')
  @Roles(UserRole.COLLEGE_ADMIN, UserRole.INSTRUCTOR)
  remove(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.divisionsService.delete(id, collegeId);
  }
}
