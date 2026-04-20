import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GlobalRuleDocument = GlobalRule & Document;

@Schema({ timestamps: true })
export class GlobalRule {
  // Single document — always ID'd as 'singleton'
  @Prop({ required: true, unique: true, default: 'singleton' })
  key: string;

  // Access & Security
  @Prop({ default: true }) require_otp: boolean;
  @Prop({ default: 24 }) jwt_expiry_hours: number;
  @Prop({ default: true }) block_expired_colleges: boolean;
  @Prop({ default: 5 }) max_login_attempts: number;

  // Assignments & Submissions
  @Prop({ default: true }) allow_late_submissions: boolean;
  @Prop({ default: 10 }) late_penalty_pct: number;
  @Prop({ default: 50 }) max_submission_size_mb: number;
  @Prop({ default: false }) auto_grade: boolean;

  // Notifications
  @Prop({ default: true }) notify_new_announcement: boolean;
  @Prop({ default: true }) notify_assignment_due: boolean;
  @Prop({ default: 24 }) reminder_hours_before: number;
  @Prop({ default: true }) notify_new_student: boolean;

  // Workshop Settings
  @Prop({ default: 'College Only' }) default_workshop_visibility: string;
  @Prop({ default: false }) require_instructor_approval: boolean;
  @Prop({ default: 200 }) max_students_per_workshop: number;
  @Prop({ default: true }) allow_self_enrollment: boolean;

  // Platform
  @Prop({ default: false }) maintenance_mode: boolean;
  @Prop({ default: 'Dark' }) default_theme: string;
  @Prop({ default: true }) forum_enabled: boolean;
  @Prop({ default: true }) sandbox_enabled: boolean;
}

export const GlobalRuleSchema = SchemaFactory.createForClass(GlobalRule);
