import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from './user.schema';
import { TeachersController } from './teachers.controller';
import { InstructorsController } from './instructors.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [TeachersController, InstructorsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {} // Triggering reload
