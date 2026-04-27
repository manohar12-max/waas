import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class McqAttempt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  materialId: string;

  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  totalQuestions: number;

  @Prop({ type: Number, required: true })
  attemptNumber: number;

  @Prop({ type: Boolean, default: false })
  isPassed: boolean;
}

export type McqAttemptDocument = McqAttempt & Document;
export const McqAttemptSchema = SchemaFactory.createForClass(McqAttempt);
