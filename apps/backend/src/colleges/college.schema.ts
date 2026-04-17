import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CollegeDocument = College & Document;

@Schema({ timestamps: true })
export class College {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  logo?: string;

  @Prop({ default: '#6366F1' })
  primaryColor: string;

  @Prop({ default: 'BASIC' })
  subscriptionTier: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId: Types.ObjectId;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const CollegeSchema = SchemaFactory.createForClass(College);
