import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CollegesService } from './colleges.service';
import { CollegesController } from './colleges.controller';
import { StatsController } from './stats.controller';
import { College, CollegeSchema } from './college.schema';
import { User, UserSchema } from '../users/user.schema';
import { Workshop, WorkshopSchema } from '../workshops/workshop.schema';
import { Attendance, AttendanceSchema } from '../workshops/attendance.schema';
import { Division, DivisionSchema } from '../divisions/division.schema';
import { Assignment, AssignmentSchema } from '../assignments/assignment.schema';
import { Submission, SubmissionSchema } from '../assignments/submission.schema';
import { Classroom, ClassroomSchema } from '../classrooms/classroom.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: College.name, schema: CollegeSchema },
      { name: User.name, schema: UserSchema },
      { name: Workshop.name, schema: WorkshopSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Division.name, schema: DivisionSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Classroom.name, schema: ClassroomSchema },
    ]),
    UsersModule,
  ],
  controllers: [CollegesController, StatsController],
  providers: [CollegesService],
  exports: [CollegesService],
})
export class CollegesModule {}
