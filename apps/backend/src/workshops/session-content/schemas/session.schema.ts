import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: true })
export class SessionMaterial {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  filePath?: string;

  @Prop({ required: true, enum: ['PDF', 'SLIDES', 'VIDEO', 'LINK', 'OTHER'], default: 'PDF' })
  type: string;

  @Prop({ default: false })
  isSourceForAI: boolean;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({
    enum: ['pending', 'extracting', 'generating', 'generated', 'approved', 'failed'],
    default: 'pending'
  })
  status: string;

  @Prop()
  aiSessionId?: string;

  @Prop({
    enum: ['Draft', 'Stage1', 'Stage2', 'Finalized'],
    default: 'Draft'
  })
  aiWorkflowStage: string;
}

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

  @Prop({ type: [SessionMaterial], default: [] })
  materials: SessionMaterial[];
}

export const SessionSchema = SchemaFactory.createForClass(Session);

