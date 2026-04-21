import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkshopMediaPostDocument = WorkshopMediaPost & Document;

@Schema({ timestamps: true })
export class WorkshopMediaPost {
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ required: true, enum: ['IMAGE', 'VIDEO'] })
  mediaType: string;

  @Prop({ required: true })
  mediaUrl: string;

  @Prop()
  caption?: string;

  @Prop()
  description?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];
}

export const WorkshopMediaPostSchema = SchemaFactory.createForClass(WorkshopMediaPost);
