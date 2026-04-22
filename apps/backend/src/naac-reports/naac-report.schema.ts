import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NaacReportDocument = NaacReport & Document;
export type NaacReportStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED';

@Schema({ timestamps: true })
export class NaacReport {
  // ── Workshop reference (auto-fills title, dates, college) ──────
  @Prop({ type: Types.ObjectId, ref: 'Workshop', required: true })
  workshopId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'College', required: true })
  collegeId: Types.ObjectId;

  // Snapshot from workshop at time of creation
  @Prop({ required: true })
  workshopTitle: string;

  @Prop({ default: '' })
  department: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: 'Criterion III: Research, Innovations & Extension' })
  naacCriterion: string;

  // ── Raw Materials uploaded by Super Admin ─────────────────────
  // 1. Official Notice/Circular (file URL)
  @Prop({ default: null })
  officialNoticeUrl: string;

  // 2. Activity Report (text — 250-500 words)
  @Prop({ default: '' })
  activityReport: string;

  // 3. Attendance Sheet (file URL)
  @Prop({ default: null })
  attendanceSheetUrl: string;

  // 4. Geotagged Photos (array of file URLs)
  @Prop({ type: [String], default: [] })
  photoUrls: string[];

  // 5. Feedback Analysis Summary (text)
  @Prop({ default: '' })
  feedbackSummary: string;

  // ── Optional structured enrichment ───────────────────────────
  @Prop({
    type: [{ name: String, designation: String, topic: String }],
    default: [],
  })
  resourcePersons: { name: string; designation: string; topic: string }[];

  @Prop({ default: 0 })
  localParticipants: number;

  @Prop({ default: 0 })
  outstationParticipants: number;

  @Prop({ default: '' })
  outcomes: string;

  // ── Intermediate AI Drafts (for user review before final generation) ──
  @Prop({ default: '' })
  draftNoticeSummary: string;

  @Prop({ default: '' })
  draftImagesSummary: string;

  @Prop({ default: '' })
  draftMaterialsSummary: string;

  // ── Generated NAAC Report ──────────────────────────────────────
  @Prop({ type: Object, default: null })
  generatedReport: {
    titlePage: any;
    introduction: string;
    sessionDetails: any;
    participantProfile: any;
    feedbackSummary: string;
    outcome: string;
    generatedAt: Date;
  } | null;

  // ── Workflow ──────────────────────────────────────────────────
  @Prop({ default: 'DRAFT', enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'DECLINED'] })
  status: NaacReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ default: null })
  approvedAt: Date;

  @Prop({ default: 'IDLE', enum: ['IDLE', 'QUEUED', 'ANALYZING', 'GENERATING', 'COMPLETED', 'FAILED', 'STOPPED'] })
  aiStatus: 'IDLE' | 'QUEUED' | 'ANALYZING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'STOPPED';

  @Prop({ default: 0 })
  aiProgress: number;

  @Prop({ default: '' })
  declineReason: string;
}

export const NaacReportSchema = SchemaFactory.createForClass(NaacReport);
