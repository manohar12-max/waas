import { Controller, Get, Post, Body, UseGuards, Delete, Param, ConflictException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.schema';
import { UsersService } from './users.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async create(@Body() createTeacherDto: any, @GetUser('collegeId') collegeId: any) {
    if (!collegeId) {
      throw new ConflictException('Identity mismatch: Your account is not associated with an institution.');
    }

    return this.usersService.create({
      ...createTeacherDto,
      role: UserRole.TEACHER, // Force TEACHER role
      collegeId,
    });
  }

  @Get()
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async findAll(@GetUser('collegeId') collegeId: string) {
    return this.usersService.findByCollege(collegeId, UserRole.TEACHER);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.usersService.remove(id, collegeId);
  }
}
