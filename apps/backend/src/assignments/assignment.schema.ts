import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssignmentDocument = Assignment & Document;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Division', required: true })
  divisionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ default: 100 })
  maxMarks: number;

  @Prop({ 
    required: true, 
    enum: ['ACTIVE', 'ARCHIVED'], 
    default: 'ACTIVE' 
  })
  status: string;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);
