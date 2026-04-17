import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Day {
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  dayNumber: number;
}

export const DaySchema = SchemaFactory.createForClass(Day);
