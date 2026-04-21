import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkshopDocument = Workshop & Document;

@Schema({ _id: false })
class Material {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['PDF', 'VIDEO', 'LINK'] })
  type: string;

  @Prop({ required: true })
  url: string;
}

@Schema({ _id: false })
class ContentSection {
  @Prop({ required: true })
  sectionTitle: string;

  @Prop({ type: [Material], default: [] })
  materials: Material[];
}

@Schema({ timestamps: true })
export class Workshop {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructorId: Types.ObjectId; // Technical mentor (Operational lead)

  @Prop({ type: [ContentSection], default: [] })
  content: ContentSection[];

  @Prop({
    type: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    required: true,
  })
  schedule: { start: Date; end: Date };

  @Prop({
    type: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    required: true,
  })
  registrationPeriod: { start: Date; end: Date };

  @Prop({ 
    required: true, 
    enum: ['DRAFT', 'ONGOING', 'COMPLETED', 'INACTIVE'],
    default: 'DRAFT'
  })
  status: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ unique: true, required: true })
  inviteToken: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  registeredStudentIds: Types.ObjectId[];

  @Prop({
    type: {
      testWeight: { type: Number, default: 40 },
      assignmentWeight: { type: Number, default: 40 },
      engagementWeight: { type: Number, default: 20 },
    },
    default: { testWeight: 40, assignmentWeight: 40, engagementWeight: 20 }
  })
  gradingConfig: { testWeight: number; assignmentWeight: number; engagementWeight: number };

  @Prop()
  summary?: string;
}

export const WorkshopSchema = SchemaFactory.createForClass(Workshop);
