import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CollegesService } from './colleges.service';
import { CollegesController } from './colleges.controller';
import { StatsController } from './stats.controller';
import { College, CollegeSchema } from './college.schema';
import { User, UserSchema } from '../users/user.schema';
import { Workshop, WorkshopSchema } from '../workshops/workshop.schema';
import { Attendance, AttendanceSchema } from '../workshops/attendance.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: College.name, schema: CollegeSchema },
      { name: User.name, schema: UserSchema },
      { name: Workshop.name, schema: WorkshopSchema },
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    UsersModule,
  ],
  controllers: [CollegesController, StatsController],
  providers: [CollegesService],
  exports: [CollegesService],
})
export class CollegesModule {}
