import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Session {
  updatedAt: Date;
  createdAt: Date;

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
    type: [{
      title: String,
      filePath: String,
      status: {
        type: String,
        enum: ['pending', 'extracting', 'generating', 'generated', 'approved', 'failed'],
        default: 'pending'
      },
      jobId: String,
      isPublished: { type: Boolean, default: false },
      updatedAt: { type: Date, default: Date.now }
    }],
    default: []
  })
  materials: any[];

  @Prop({
    required: true,
    enum: ['pending', 'extracting', 'generating', 'generated', 'approved', 'failed'],
    default: 'pending'
  })
  status: string;

  @Prop()
  jobId?: string;

  @Prop({ default: false })
  isMaterialPublished: boolean;

  @Prop({ default: false })
  isContentPublished: boolean;

  @Prop()
  aiSessionId?: string;

  @Prop({ default: 'none' })
  aiStage: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
