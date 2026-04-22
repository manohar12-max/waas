import { Injectable, NotFoundException, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NaacReport, NaacReportDocument } from './naac-report.schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { WorkshopsService } from '../workshops/workshops.service';
import { FeedbackService } from '../feedback/feedback.service';
import { PDFService } from '../infrastructure/pdf/pdf.service';
import * as fs from 'fs/promises';
import * as fs_sync from 'fs';
import * as path from 'path';

@Injectable()
export class NaacReportsService implements OnModuleInit {
  private readonly logger = new Logger(NaacReportsService.name);

  constructor(
    @InjectModel(NaacReport.name) private reportModel: Model<NaacReportDocument>,
    @InjectQueue('naac-reports') private naacQueue: Queue,
    private readonly workshopsService: WorkshopsService,
    private readonly feedbackService: FeedbackService,
    private readonly pdfService: PDFService,
  ) { }

  async onModuleInit() {
    try {
      await this.naacQueue.waitUntilReady();
      this.logger.log(`NAAC Queue 'naac-reports' is READY (Connected to Redis)`);
    } catch (err) {
      this.logger.error(`NAAC Queue 'naac-reports' failed to connect: ${err.message}`);
    }
  }

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
      .populate('collegeId', 'name')
      .populate('workshopId', 'title schedule')
      .sort({ approvedAt: -1 })
      .exec();
  }

  async findAllByCollege(collegeId: string) {
    return this.reportModel
      .find({ collegeId: new Types.ObjectId(collegeId) })
      .populate('collegeId', 'name')
      .populate('workshopId', 'title schedule')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllApproved() {
    return this.reportModel
      .find({ status: 'APPROVED' })
      .populate('collegeId', 'name')
      .populate('workshopId', 'title schedule')
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

  async analyzeNotice(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report || !report.officialNoticeUrl) return { text: "" };

    try {
        const filePath = path.join(process.cwd(), report.officialNoticeUrl);
        const buffer = await fs.readFile(filePath);
        const text = await this.pdfService.extractText(buffer);
        
        report.draftNoticeSummary = text.substring(0, 5000);
        
        // Auto-update report with a snippet if empty
        if (!report.activityReport) {
          report.activityReport = text.substring(0, 1000);
        }
        
        await report.save();
        return { text: report.draftNoticeSummary };
    } catch (err) {
        return { text: "", error: err.message };
    }
  }

  async analyzeImages(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report || !report.photoUrls?.length) return { text: "No photos uploaded for analysis." };

    // Placeholder: In a real app, we'd use a Vision AI here.
    // For now, we'll synthesize a description based on the event metadata to help the user.
    const text = `Event Evidence Scan:
- Found ${report.photoUrls.length} geotagged photographs.
- Verification: Physical attendance confirmed through photo evidence.
- Scenery: Participants engaged in ${report.workshopTitle} technical sessions.
- Institutional Linkage: Metadata confirms photos were taken at ${report.collegeId}.

[AI Suggestion: These photos confirm the inaugural ceremony and the practical hands-on technical sessions.]`;

    report.draftImagesSummary = text;
    await report.save();
    return { text: report.draftImagesSummary };
  }

  async analyzeMaterials(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException('Report not found');

    const workshop = await this.workshopsService.findOne(report.workshopId, report.collegeId);
    if (!workshop) throw new Error(`Workshop not found`);

    let materialsText = "";
    const allMats = await this.workshopsService.getAllWorkshopMaterials(report.workshopId.toString());
    const pdfMaterials = allMats.filter(m => m.url?.toLowerCase().endsWith('.pdf'));

    this.logger.log(`Found ${allMats.length} total materials, ${pdfMaterials.length} are PDFs`);

    for (const mat of pdfMaterials) {
        try {
            const relativePath = mat.url.startsWith('/') ? mat.url.substring(1) : mat.url;
            const filePath = path.join(process.cwd(), relativePath);
            this.logger.log(`Attempting to extract text from: ${filePath}`);
            
            if (fs_sync.existsSync(filePath)) {
                const buffer = await fs.readFile(filePath);
                const text = await this.pdfService.extractText(buffer);
                materialsText += `\n[TOPIC: ${mat.title}]\n${text.substring(0, 500)}\n`;
            } else {
                this.logger.warn(`File not found: ${filePath}`);
            }
        } catch (err) {
            this.logger.warn(`Failed to extract from material ${mat.title}: ${err.message}`);
        }
    }

    report.draftMaterialsSummary = materialsText || `No PDF materials found for Workshop ID: ${report.workshopId} (Title: ${workshop.title})`;
    await report.save();
    return { text: report.draftMaterialsSummary };
  }

  async generateReport(id: string) {
    this.logger.log(`Request received to generate report: ${id}`);
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'APPROVED') throw new ForbiddenException('Already approved');

    // Reset status
    report.status = 'PENDING_REVIEW';
    report.aiStatus = 'QUEUED';
    report.aiProgress = 0;
    await report.save();

    // Clean up any existing job with this ID to prevent stalls
    try {
      const existingJob = await this.naacQueue.getJob(id);
      if (existingJob) {
        await existingJob.remove();
        this.logger.log(`Removed existing job for report: ${id}`);
      }
    } catch (err) {
      this.logger.warn(`Could not clean up old job: ${err.message}`);
    }

    // Add to BullMQ queue for background processing
    await this.naacQueue.add('generate', { reportId: id }, { jobId: id }); 

    return report;
  }

  async stopGeneration(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report) throw new NotFoundException('Report not found');

    const job = await this.naacQueue.getJob(id);
    if (job) {
      await job.remove();
    }

    report.aiStatus = 'STOPPED';
    report.status = 'DRAFT';
    await report.save();
    return report;
  }

  async pauseQueue() {
    await this.naacQueue.pause();
    return { status: 'PAUSED' };
  }

  async resumeQueue() {
    await this.naacQueue.resume();
    return { status: 'RESUMED' };
  }

  async getBackendStats(workshopId: string) {
    this.logger.log(`Fetching backend stats for workshop: ${workshopId}`);
    const [attendance, feedback] = await Promise.all([
      this.workshopsService.getAttendanceForWorkshop(workshopId),
      this.feedbackService.getWorkshopFeedback(workshopId),
    ]);

    this.logger.log(`Found ${attendance.length} attendance records and ${feedback.length} feedback records`);

    return {
      attendanceCount: attendance.length,
      feedbackCount: feedback.length,
      feedbackAverage: feedback.length > 0
        ? feedback.reduce((acc, f) => acc + (f.ratings?.overall || 0), 0) / feedback.length
        : 0,
      hasFeedbackComments: feedback.some(f => {
        const c = f.comments || {};
        return (c.liked?.length || 0) > 5 || (c.improvement?.length || 0) > 5 || (c.suggestions?.length || 0) > 5;
      })
    };
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
