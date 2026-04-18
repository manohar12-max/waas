import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnnouncementDocument = Announcement & Document;

@Schema({ timestamps: true })
export class Announcement {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, enum: ['INSTRUCTOR', 'TEACHER', 'SUPER_ADMIN'] })
  authorRole: string;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: false })
  workshopId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Division', required: false })
  divisionId?: Types.ObjectId;

  @Prop({ default: false })
  isPinned: boolean;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
