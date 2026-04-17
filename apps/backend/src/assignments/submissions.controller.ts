import { Controller, Post, Get, Body, Param, Query, Patch, UseGuards, Request } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // PUBLIC endpoint - validated by token
  @Get('validate-link')
  async validateLink(@Query('token') token: string) {
    const decoded = this.assignmentsService.verifySubmissionToken(token);
    const assignment = await this.assignmentsService.getAssignmentById(decoded.aid);
    return { assignment, studentId: decoded.sid };
  }

  @Post('validate-student')
  async validateStudent(@Body() data: { emailOrPhone: string, assignmentId: string }) {
    return this.assignmentsService.validateStudentForAssignment(data.emailOrPhone, data.assignmentId);
  }

  // PUBLIC endpoint - validated by token
  @Post(':assignmentId')
  submit(
    @Param('assignmentId') assignmentId: string,
    @Body() payload: any
  ) {
    return this.assignmentsService.submitAssignment(assignmentId, payload);
  }

  // TEACHER endpoint
  @Get('assignment/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissions(id);
  }

  // TEACHER endpoint
  @Patch(':id/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  grade(
    @Param('id') submissionId: string,
    @Body() data: any,
    @Request() req: any
  ) {
    return this.assignmentsService.gradeSubmission(submissionId, data, req.user.userId);
  }
}
