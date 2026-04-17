import { Controller, Get, Post, Patch, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';
import { GetUser } from '../auth/get-user.decorator';
import { WorkshopsService } from '../workshops/workshops.service';
import { DivisionsService } from '../divisions/divisions.service';

@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class InstructorController {
  constructor(
    private readonly workshopsService: WorkshopsService,
    private readonly divisionsService: DivisionsService,
  ) {}

  @Get('workshops')
  async getMyWorkshops(@GetUser('id') instructorId: string) {
    return this.workshopsService.findByInstructor(instructorId);
  }

  @Patch('workshops/:id/configure')
  async configureWorkshop(
    @Param('id') id: string,
    @Body() configDto: any,
    @GetUser('id') instructorId: string,
    @GetUser('collegeId') collegeId: string,
  ) {
    const workshop = await this.workshopsService.findOne(id, collegeId);
    if (!workshop) {
      throw new ForbiddenException('Workshop not found or access denied');
    }
    if (workshop.instructorId._id.toString() !== instructorId) {
      throw new ForbiddenException('You are not the instructor for this workshop');
    }
    return this.workshopsService.update(id, configDto);
  }

  @Post('divisions')
  async createDivision(
    @Body() createDivisionDto: any,
    @GetUser('collegeId') collegeId: string,
    @GetUser('id') instructorId: string,
  ) {
    // Check if the instructor is assigned to the workshop linked in createDivisionDto
    const workshop = await this.workshopsService.findOne(createDivisionDto.workshopId, collegeId);
    if (!workshop) {
      throw new ForbiddenException('Workshop not found or access denied');
    }
    if (workshop.instructorId._id.toString() !== instructorId) {
      throw new ForbiddenException('Authorization failed: You are not assigned to this workshop.');
    }
    return this.divisionsService.create(createDivisionDto, collegeId);
  }

  @Get('divisions/:id/stats')
  async getDivisionStats(@Param('id') id: string) {
    // Basic stats for now
    return this.divisionsService.getStats(id);
  }
}
