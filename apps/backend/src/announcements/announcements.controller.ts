import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // All authenticated users can read
  @Get()
  findAll(@Request() req: any) {
    const { role, collegeId } = req.user;
    return this.announcementsService.findAll(role, collegeId);
  }

  // Only Super Admin and Instructor can create
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  create(@Request() req: any, @Body() body: any) {
    const { id, name, role, collegeId } = req.user;
    return this.announcementsService.create(body, id, name, role, collegeId);
  }

  // Only Super Admin and Instructor can update
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const { id: userId, role, collegeId } = req.user;
    return this.announcementsService.update(id, body, userId, role, collegeId);
  }

  // Only Super Admin and Instructor can delete
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  remove(@Request() req: any, @Param('id') id: string) {
    const { id: userId, role, collegeId } = req.user;
    return this.announcementsService.remove(id, userId, role, collegeId);
  }
}
