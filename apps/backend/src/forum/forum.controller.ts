import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { ForumService } from './forum.service';
import { GetUser } from '../auth/get-user.decorator';

@Controller('forum')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  createPost(@Body() createPostDto: any, @GetUser('id') userId: string, @GetUser('collegeId') collegeId: string) {
    return this.forumService.createPost(createPostDto, userId, collegeId);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  findAllPosts(@GetUser('collegeId') collegeId: string) {
    return this.forumService.findAllPosts(collegeId);
  }

  @Put(':id')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  updatePost(
    @Param('id') id: string,
    @Body() updatePostDto: any,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string
  ) {
    return this.forumService.updatePost(id, updatePostDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  deletePost(
    @Param('id') id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string
  ) {
    return this.forumService.deletePost(id, userId, userRole);
  }

  @Post(':id/like')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  toggleLike(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.forumService.toggleLike(id, userId);
  }

  @Get(':id/comments')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  getComments(@Param('id') id: string) {
    return this.forumService.getComments(id);
  }

  @Post(':id/comments')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @GetUser('id') userId: string
  ) {
    return this.forumService.addComment(id, content, userId);
  }

  @Delete('comments/:commentId')
  @Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  deleteComment(
    @Param('commentId') commentId: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string
  ) {
    return this.forumService.deleteComment(commentId, userId, userRole);
  }
}
