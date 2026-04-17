import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true, enum: ['link', 'file'] })
  submissionType: string;

  @Prop()
  link?: string;

  @Prop()
  fileUrl?: string;

  @Prop({ required: true })
  submittedAt: Date;

  @Prop({ 
    required: true, 
    enum: ['submitted', 'late'],
    default: 'submitted'
  })
  status: string;

  @Prop({ default: 0 })
  marks: number;

  @Prop()
  feedback?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  gradedBy?: Types.ObjectId;

  @Prop()
  gradedAt?: Date;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
