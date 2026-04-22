import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

@Schema({ _id: false })
class Ratings {
  @Prop({ required: true, min: 1, max: 5 })
  contentQuality: number;

  @Prop({ required: true, min: 1, max: 5 })
  clarity: number;

  @Prop({ required: true, min: 1, max: 5 })
  engagement: number;

  @Prop({ required: true, min: 1, max: 5 })
  usefulness: number;

  @Prop({ required: true, min: 1, max: 5 })
  overall: number;
}

@Schema({ _id: false })
class Comments {
  @Prop()
  liked: string;

  @Prop()
  improvement: string;

  @Prop()
  suggestions: string;
}

@Schema({ _id: false })
class SubmittedBy {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['STUDENT', 'TEACHER'] })
  role: string;
}

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ required: true, enum: ['SESSION', 'WORKSHOP'] })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session' }) // Optional for WORKSHOP type
  sessionId?: Types.ObjectId;

  @Prop({ type: Ratings, required: true })
  ratings: Ratings;

  @Prop({ type: Comments })
  comments: Comments;

  @Prop({ type: SubmittedBy, required: true })
  submittedBy: SubmittedBy;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Ensure one feedback per user per session/workshop
FeedbackSchema.index({ 'submittedBy.userId': 1, workshopId: 1, sessionId: 1, type: 1 }, { unique: true });
