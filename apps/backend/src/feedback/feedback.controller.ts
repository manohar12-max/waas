import { Controller, Post, Get, Body, Param, UseGuards, Query } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { UserRole } from '../users/user.schema';


@Controller('feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(@GetUser() user: any, @Body() body: any) {
    return this.feedbackService.create({
      ...body,
      submittedBy: {
        userId: user._id,
        role: user.role,
      },
    });
  }

  @Get('my')
  async getMyFeedback(@GetUser('_id') userId: string) {
    return this.feedbackService.findUserFeedback(userId);
  }

  @Get('session/:sessionId')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  async getSessionFeedback(@Param('sessionId') sessionId: string) {

    return this.feedbackService.getSessionFeedback(sessionId);
  }

  @Get('workshop/:workshopId')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  async getWorkshopFeedback(@Param('workshopId') workshopId: string) {

    return this.feedbackService.getWorkshopFeedback(workshopId);
  }

  @Get('analytics/:workshopId')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.SUPER_ADMIN)
  async getAnalytics(@Param('workshopId') workshopId: string) {

    return this.feedbackService.getAnalytics(workshopId);
  }

  @Get('list')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN)
  async getAllFeedback(@Query() query: any) {

      return this.feedbackService.getAllFeedbackForAdmin(query);
  }
}
