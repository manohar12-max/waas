import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  create(@Body() data: any, @Request() req: any) {
    return this.assignmentsService.createAssignment(data, req.user.userId);
  }

  @Get('division/:id')
  @UseGuards(JwtAuthGuard)
  getByDivision(@Param('id') id: string) {
    return this.assignmentsService.getAssignmentsByDivision(id);
  }

  @Get('debug/all')
  getAll() {
     return this.assignmentsService.findAllAssignments();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.assignmentsService.getAssignmentById(id);
  }

  // Teacher helper to generate links for all students in a division
  // This would usually be called to get a list of links to distribute
  @Post(':id/token/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  generateToken(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body('divisionId') divisionId: string
  ) {
    const token = this.assignmentsService.generateSubmissionToken(studentId, id, divisionId);
    return { token };
  }
}
