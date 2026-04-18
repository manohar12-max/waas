import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ForumPostDocument = ForumPost & Document;

@Schema({ timestamps: true })
export class ForumPost {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop()
  mediaUrl?: string;

  @Prop({ enum: ['IMAGE', 'VIDEO', 'NONE'], default: 'NONE' })
  mediaType: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];

  @Prop({ default: false })
  isEdited: boolean;
}

export const ForumPostSchema = SchemaFactory.createForClass(ForumPost);
