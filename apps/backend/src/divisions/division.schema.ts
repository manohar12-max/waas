import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DivisionDocument = Division & Document;

@Schema({ timestamps: true })
export class Division {
  @Prop({ required: true })
  name: string; // e.g. "10th-A", "12th-Science"

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  teacherId?: Types.ObjectId; // The managing faculty (from Prompt 3)

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const DivisionSchema = SchemaFactory.createForClass(Division);
