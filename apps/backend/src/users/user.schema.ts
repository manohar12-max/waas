import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COLLEGE_ADMIN = 'COLLEGE_ADMIN',
  TEACHER = 'TEACHER',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  password?: string;

  @Prop()
  phone?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({
    required: true,
    enum: UserRole,
    default: UserRole.STUDENT,
    index: true,
  })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'College', required: false, index: true })
  collegeId?: Types.ObjectId;

  @Prop({ default: true })
  active: boolean;

  @Prop()
  profileImage?: string;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ default: null })
  lockedUntil?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
