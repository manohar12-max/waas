import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SandboxProjectDocument = SandboxProject & Document;

@Schema({ timestamps: true })
export class SandboxProject {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  language: string;

  @Prop({ default: '' })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;
}

export const SandboxProjectSchema = SchemaFactory.createForClass(SandboxProject);
