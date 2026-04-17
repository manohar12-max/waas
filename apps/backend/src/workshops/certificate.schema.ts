import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CertificateDocument = Certificate & Document;

@Schema({ timestamps: true })
export class Certificate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  certificateHash: string; // Cryptographic unique identifier

  @Prop({ required: true })
  issueDate: Date;

  @Prop({ default: true })
  isValid: boolean;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
