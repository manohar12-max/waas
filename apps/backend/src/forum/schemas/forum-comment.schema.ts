import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ForumCommentDocument = ForumComment & Document;

@Schema({ timestamps: true })
export class ForumComment {
  @Prop({ type: Types.ObjectId, ref: 'ForumPost', required: true })
  post: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;
}

export const ForumCommentSchema = SchemaFactory.createForClass(ForumComment);
