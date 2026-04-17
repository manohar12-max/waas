import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Day', required: true })
  dayId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  rawContentUrl?: string;

  @Prop()
  filePath?: string;

  @Prop({
    required: true,
    enum: ['pending', 'extracting', 'generating', 'generated', 'approved', 'failed'],
    default: 'pending'
  })
  status: string;

  @Prop()
  jobId?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
