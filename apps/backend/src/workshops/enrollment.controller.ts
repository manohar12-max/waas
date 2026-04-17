import { Controller, Post, Body } from '@nestjs/common';
import { WorkshopsService } from './workshops.service';
import { Public } from '../auth/public.decorator';

@Controller('enrollment')
export class EnrollmentController {
  constructor(private readonly workshopsService: WorkshopsService) { }

  @Public()
  @Post()
  enroll(@Body() enrollDto: any) {
    return this.workshopsService.enrollStudent(enrollDto);
  }

  @Public()
  @Post('check-in')
  checkin(@Body() checkinDto: { workshopId: string; email: string }) {
    return this.workshopsService.checkinByEmail(checkinDto.workshopId, checkinDto.email);
  }
}
