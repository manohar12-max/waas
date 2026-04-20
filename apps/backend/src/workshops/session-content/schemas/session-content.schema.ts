import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SessionContent {
  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  mcqs: any[];

  @Prop({ type: Object })
  applicationProblem: any;

  @Prop({ type: Object })
  slides: any;

  @Prop({ type: [Object], default: [] })
  materials: any[];

  @Prop()
  sourceMaterialTitle: string;

  @Prop()
  sourceMaterialUrl: string;

  @Prop()
  aiSessionId: string;
}

export const SessionContentSchema = SchemaFactory.createForClass(SessionContent);
