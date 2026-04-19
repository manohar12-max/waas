import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

export type AnnouncementType = 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ default: 'INFO', enum: ['INFO', 'WARNING', 'SUCCESS', 'URGENT'] })
  type: AnnouncementType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop()
  authorName: string;

  // null = global (Super Admin), ObjectId = college-specific (Instructor)
  @Prop({ type: Types.ObjectId, ref: 'College', default: null })
  collegeId: Types.ObjectId | null;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  expiresAt?: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
