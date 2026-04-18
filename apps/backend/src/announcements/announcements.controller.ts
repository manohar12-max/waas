import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.SUPER_ADMIN)
  async create(@Body() createDto: any, @GetUser() user: any) {
    return this.announcementsService.create(createDto, user);
  }

  @Get()
  async findAll(
    @Query('workshopId') workshopId?: string,
    @Query('divisionId') divisionId?: string,
  ) {
    return this.announcementsService.findAll(workshopId, divisionId);
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.SUPER_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @GetUser() user: any,
  ) {
    return this.announcementsService.update(id, updateDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @GetUser() user: any) {
    return this.announcementsService.remove(id, user);
  }
}
