import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Classroom, ClassroomSchema } from './classroom.schema';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Classroom.name, schema: ClassroomSchema }]),
  ],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
