import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ 
    required: true, 
    enum: ['PRESENT', 'ABSENT', 'LATE'],
    default: 'PRESENT'
  })
  status: string;

  @Prop({ 
    required: true, 
    enum: ['QR', 'OTP', 'MANUAL'],
    default: 'QR'
  })
  verificationMethod: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  verifiedBy: Types.ObjectId; // Either Teacher or Instructor
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
