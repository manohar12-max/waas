import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Division, DivisionSchema } from './division.schema';
import { DivisionsService } from './divisions.service';
import { DivisionsController } from './divisions.controller';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Division.name, schema: DivisionSchema },
      { name: User.name, schema: UserSchema }, // Explicitly register for population
    ]),
  ],
  providers: [DivisionsService],
  controllers: [DivisionsController],
  exports: [DivisionsService],
})
export class DivisionsModule {}
