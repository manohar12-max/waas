import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Workshop, WorkshopSchema } from './workshop.schema';
import { Attendance, AttendanceSchema } from './attendance.schema';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';
import { EnrollmentController } from './enrollment.controller';
import { InstructorController } from './instructor.controller';
import { TeacherController } from './teacher.controller';
import { User, UserSchema } from '../users/user.schema';
import { WorkshopMediaPost, WorkshopMediaPostSchema } from './media-post.schema';
import { TeacherContent, TeacherContentSchema } from './teacher-content.schema';
import { DivisionsModule } from '../divisions/divisions.module';

import { MediaFeedController } from './media-feed.controller';
import { LearningContentController } from './learning-content.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Workshop.name, schema: WorkshopSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: User.name, schema: UserSchema },
      { name: WorkshopMediaPost.name, schema: WorkshopMediaPostSchema },
      { name: TeacherContent.name, schema: TeacherContentSchema },
    ]),
    DivisionsModule,
  ],
  providers: [WorkshopsService],
  controllers: [
    WorkshopsController, 
    EnrollmentController, 
    InstructorController, 
    TeacherController,
    MediaFeedController,
    LearningContentController
  ],
  exports: [WorkshopsService],
})
export class WorkshopsModule { }
