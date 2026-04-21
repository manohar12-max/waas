import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';
import { WorkshopsService } from './workshops.service';

@Controller('media-feed')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaFeedController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  async createPost(
    @Body() createDto: any,
    @GetUser('id') teacherId: string,
  ) {
    return this.workshopsService.createMediaPost(createDto, teacherId);
  }

  @Get(':workshopId')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.STUDENT, UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN)
  async getFeed(@Param('workshopId') workshopId: string) {
    return this.workshopsService.getMediaFeed(workshopId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN)
  async deletePost(@Param('id') id: string) {
    return this.workshopsService.deleteMediaPost(id);
  }

  @Post(':id')
  @Roles(UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN)
  async updatePost(@Param('id') id: string, @Body() updateDto: any) {
    return this.workshopsService.updateMediaPost(id, updateDto);
  }
}
