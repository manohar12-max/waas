import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Division, DivisionSchema } from './division.schema';
import { DivisionsService } from './divisions.service';
import { DivisionsController } from './divisions.controller';
import { User, UserSchema } from '../users/user.schema';

import { Workshop, WorkshopSchema } from '../workshops/workshop.schema';
import { Attendance, AttendanceSchema } from '../workshops/attendance.schema';
import { Assignment, AssignmentSchema } from '../assignments/assignment.schema';
import { Submission, SubmissionSchema } from '../assignments/submission.schema';
import { TeacherContent, TeacherContentSchema } from '../workshops/teacher-content.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Division.name, schema: DivisionSchema },
      { name: User.name, schema: UserSchema }, 
      { name: Workshop.name, schema: WorkshopSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: TeacherContent.name, schema: TeacherContentSchema },
    ]),
  ],
  providers: [DivisionsService],
  controllers: [DivisionsController],
  exports: [DivisionsService],
})
export class DivisionsModule {}
