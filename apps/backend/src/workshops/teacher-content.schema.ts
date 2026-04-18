import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeacherContentDocument = TeacherContent & Document;

@Schema({ timestamps: true })
export class TeacherContent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Division', required: true })
  divisionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ required: true, enum: ['PDF', 'VIDEO', 'IMAGE', 'LINK', 'SLIDES'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  description?: string;
}

export const TeacherContentSchema = SchemaFactory.createForClass(TeacherContent);
