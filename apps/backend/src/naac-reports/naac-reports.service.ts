import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NaacReport, NaacReportDocument } from './naac-report.schema';

@Injectable()
export class NaacReportsService {
  private readonly logger = new Logger(NaacReportsService.name);

  constructor(
    @InjectModel(NaacReport.name) private reportModel: Model<NaacReportDocument>,
  ) {}

  /** Create a DRAFT report linked to an existing workshop */
  async create(body: any, createdById: string) {
    const report = new this.reportModel({
      workshopId: new Types.ObjectId(body.workshopId),
      collegeId: new Types.ObjectId(body.collegeId),
      workshopTitle: body.workshopTitle,
      department: body.department || '',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      naacCriterion: body.naacCriterion || 'Criterion III: Research, Innovations & Extension',
      createdBy: new Types.ObjectId(createdById),
      status: 'DRAFT',
    });
    return report.save();
  }

  async findAll() {
    return this.reportModel
      .find()
      .populate('collegeId', 'name')
      .populate('workshopId', 'title schedule')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByCollege(collegeId: string) {
    return this.reportModel
      .find({ collegeId: new Types.ObjectId(collegeId), status: 'APPROVED' })
      .sort({ approvedAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const r = await this.reportModel
      .findById(id)
      .populate('collegeId', 'name')
      .populate('workshopId', 'title schedule')
      .exec();
    if (!r) throw new NotFoundException('Report not found');
    return r;
  }

  /** Patch any raw-data field */
  async updateRawData(id: string, data: any) {
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'APPROVED') throw new ForbiddenException('Cannot edit an approved report');
    if (report.status === 'DECLINED') { data.status = 'DRAFT'; data.declineReason = ''; }
    Object.assign(report, data);
    return report.save();
  }

  async generateReport(id: string) {
    const report = await this.reportModel.findById(id).populate('collegeId', 'name');
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'APPROVED') throw new ForbiddenException('Already approved');

    const college = (report.collegeId as any)?.name || 'Institution';
    const total = (report.localParticipants || 0) + (report.outstationParticipants || 0);

    const fmt = (d: Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateRange = report.startDate && report.endDate
      ? `${fmt(report.startDate)} – ${fmt(report.endDate)}`
      : 'Date(s) as per schedule';

    report.generatedReport = {
      generatedAt: new Date(),
      titlePage: {
        workshopName: report.workshopTitle,
        college,
        department: report.department || 'Organising Department',
        dateRange,
        naacCriterion: report.naacCriterion,
      },
      introduction: report.activityReport ||
        `This workshop titled "${report.workshopTitle}" was organised by the ${report.department || 'department'} ` +
        `at ${college} during ${dateRange}. The event aimed to enhance the knowledge and practical ` +
        `skills of participants in the relevant domain, aligning with the institution's commitment to ` +
        `academic excellence under ${report.naacCriterion}.`,
      sessionDetails: {
        resourcePersons: report.resourcePersons?.length
          ? report.resourcePersons
          : [{ name: '—', designation: '—', topic: report.workshopTitle }],
        supportingDocs: {
          officialNotice: !!report.officialNoticeUrl,
          attendanceSheet: !!report.attendanceSheetUrl,
          photos: report.photoUrls?.length || 0,
        },
      },
      participantProfile: {
        local: report.localParticipants || 0,
        outstation: report.outstationParticipants || 0,
        total,
        summary: `A total of ${total} participants attended the workshop — ` +
          `${report.localParticipants || 0} local and ${report.outstationParticipants || 0} outstation.`,
      },
      feedbackSummary: report.feedbackSummary ||
        'Participant feedback was collected through structured forms. The overall response was positive. ' +
        'Suggestions received will be incorporated in future programmes.',
      outcome: report.outcomes ||
        `The workshop on "${report.workshopTitle}" successfully achieved its stated objectives. ` +
        `Participants gained valuable insights and the event will be documented in the AQAR under the relevant criterion.`,
    };

    report.status = 'PENDING_REVIEW';
    return report.save();
  }

  async approveReport(id: string) {
    const r = await this.reportModel.findById(id);
    if (!r) throw new NotFoundException('Not found');
    r.status = 'APPROVED';
    r.approvedAt = new Date();
    r.declineReason = '';
    return r.save();
  }

  async declineReport(id: string, reason: string) {
    const r = await this.reportModel.findById(id);
    if (!r) throw new NotFoundException('Not found');
    r.status = 'DRAFT';
    r.declineReason = reason || 'No reason provided';
    r.generatedReport = null;
    return r.save();
  }

  async cancelReview(id: string) {
    const r = await this.reportModel.findById(id);
    if (!r) throw new NotFoundException('Not found');
    if (r.status === 'PENDING_REVIEW') { r.status = 'DRAFT'; r.generatedReport = null; }
    return r.save();
  }

  async remove(id: string) {
    return this.reportModel.findByIdAndDelete(id);
  }
}
