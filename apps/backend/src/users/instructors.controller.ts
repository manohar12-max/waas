import { Controller, Get, Post, Body, UseGuards, Delete, Param, ConflictException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.schema';
import { UsersService } from './users.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLEGE_ADMIN)
export class InstructorsController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createDto: any, @GetUser('collegeId') collegeId: any) {
    if (!collegeId) {
      throw new ConflictException('Identity mismatch: Your account is not associated with an institution.');
    }

    return this.usersService.create({
      ...createDto,
      role: UserRole.INSTRUCTOR, // Force INSTRUCTOR role
      collegeId,
    });
  }

  @Get()
  async findAll(@GetUser('collegeId') collegeId: string) {
    return this.usersService.findByCollege(collegeId, UserRole.INSTRUCTOR);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('collegeId') collegeId: string) {
    return this.usersService.remove(id, collegeId);
  }
} // Onboarding enabled
