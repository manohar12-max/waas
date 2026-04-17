import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SessionContent {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  mcqs: any[];

  @Prop({ type: [Object], default: [] })
  materials: any[];
}

export const SessionContentSchema = SchemaFactory.createForClass(SessionContent);
