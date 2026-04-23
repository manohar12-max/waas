import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NaacReport, NaacReportDocument } from './naac-report.schema';
import { WorkshopsService } from '../workshops/workshops.service';
import { FeedbackService } from '../feedback/feedback.service';
import { GroqService } from '../infrastructure/ai/groq.service';
import { PDFService } from '../infrastructure/pdf/pdf.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Processor('naac-reports', { concurrency: 3 })
export class NaacReportsProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(NaacReportsProcessor.name);

  constructor(
    @InjectModel(NaacReport.name) private reportModel: Model<NaacReportDocument>,
    private readonly workshopsService: WorkshopsService,
    private readonly feedbackService: FeedbackService,
    private readonly groqService: GroqService,
    private readonly pdfService: PDFService,
  ) {
    super();
    console.log('--- NAAC Reports Processor Constructor Initialized ---');
  }

  onModuleInit() {
    this.logger.log('NAAC Reports Processor Worker started and listening for jobs...');
    console.log('--- NAAC REPORTS WORKER IS ACTIVE ---');
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`[JOB ${job.id}] STARTED`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`[JOB ${job.id}] FAILED: ${error.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`[JOB ${job.id}] COMPLETED`);
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { reportId } = job.data;
    this.logger.log(`[JOB ${job.id}] Picking up NAAC report generation for: ${reportId}`);

    const report = await this.reportModel.findById(reportId); // Don't populate yet, keep original IDs for service call
    if (!report) throw new Error(`Report ${reportId} not found`);

    const workshop = await this.workshopsService.findOne(report.workshopId, report.collegeId);
    if (!workshop) throw new Error(`Workshop not found or institutional access denied.`);
    
    // Now we can use the report data and fetch college name if needed
    await report.populate('collegeId'); 

    try {
      const checkStatus = async () => {
        const current = await this.reportModel.findById(reportId).select('aiStatus');
        if (current?.aiStatus === 'STOPPED') {
          this.logger.warn(`Report ${reportId} was stopped by user. Aborting process.`);
          throw new Error('STOPPED_BY_USER');
        }
      };

      // 1. ANALYZING PHASE
      report.aiStatus = 'ANALYZING';
      report.aiProgress = 10;
      await report.save();

      const [attendance, feedback] = await Promise.all([
        this.workshopsService.getAttendanceForWorkshop(report.workshopId),
        this.feedbackService.getWorkshopFeedback(report.workshopId.toString()),
      ]);

      const localParticipants = attendance.length;
      const feedbackComments = feedback.map(f => {
        const c = f.comments || {};
        return `${c.liked || ''} ${c.improvement || ''} ${c.suggestions || ''}`.trim();
      }).filter(text => text.length > 5).join('\n');
      
      report.aiProgress = 30;
      await report.save();
      await checkStatus();

      let circularText = "";
      if (report.officialNoticeUrl) {
        try {
            if (report.officialNoticeUrl.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), report.officialNoticeUrl);
                if (filePath.toLowerCase().endsWith('.pdf')) {
                    const buffer = await fs.readFile(filePath);
                    circularText = await this.pdfService.extractText(buffer);
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to extract text from circular: ${err.message}`);
        }
      }

      await checkStatus();

      // --- Deep extraction from Workshop Materials (PDFs only) ---
      let materialsText = "";
      const pdfMaterials = (await this.workshopsService.getAllWorkshopMaterials(report.workshopId.toString()))
        .filter(m => m.url?.toLowerCase().endsWith('.pdf'));

      for (const mat of pdfMaterials) {
        await checkStatus();
        try {
            if (mat.url.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), mat.url);
                const buffer = await fs.readFile(filePath);
                this.logger.log(`Deep scanning material: ${mat.title}`);
                const text = await this.pdfService.extractText(buffer);
                materialsText += `\n[From Material: ${mat.title}]\n${text.substring(0, 1000)}\n`;
            }
        } catch (err) {
            this.logger.warn(`Failed to extract from material ${mat.title}: ${err.message}`);
        }
      }

      report.aiProgress = 50;
      await report.save();
      await checkStatus();

      // 2. GENERATING PHASE
      report.aiStatus = 'GENERATING';
      report.aiProgress = 60;
      await report.save();

      // Deep Clean: Remove all non-essential chars and potential JSON-breaking snippets
      const deepClean = (txt: string) => {
        if (!txt) return 'None';
        return txt
          .replace(/[ﬁﬂ]/g, (m) => (m === 'ﬁ' ? 'fi' : 'fl')) // Fix ligatures
          .replace(/[\{\}]/g, '') // Remove braces from input to avoid confusing the model
          .replace(/\s+/g, ' ')
          .replace(/["']/g, '') // Remove quotes from input
          .trim()
          .substring(0, 1200); // Strict limit to keep prompt focused
      };

      const prompt = `
### TASK: Generate NAAC Activity Report JSON
### RULE: You must return ONLY the JSON object. No preamble. No text before or after.

### EXAMPLE SUCCESSFUL OUTPUT:
{
  "titlePage": { "workshopName": "Example", "college": "Example College", "department": "CS", "dateRange": "May 1st 2026", "naacCriterion": "III" },
  "introduction": "This workshop focused on...",
  "sessionDetails": { "resourcePersons": [], "summary": "Sessions covered...", "supportingDocs": { "officialNotice": true, "attendanceSheet": true, "photos": 5 } },
  "participantProfile": { "local": 50, "outstation": 0, "total": 50, "summary": "A total of 50 students..." },
  "feedbackSummary": "Participants expressed high satisfaction...",
  "outcome": "Students gained hands-on experience..."
}

### WORKSHOP INPUT DATA:
- INSTITUTION: ${(report.collegeId as any)?.name || 'The Institution'}
- WORKSHOP: ${report.workshopTitle}
- DEPT: ${report.department}
- DATES: ${report.startDate} to ${report.endDate}
- CRITERION: ${report.naacCriterion}
- PARTICIPANTS: ${localParticipants}
- FEEDBACK_COMMENTS: ${deepClean(feedbackComments)}
- FACULTY_SUMMARY: ${deepClean(report.feedbackSummary)}
- CIRCULAR_TEXT: ${deepClean(circularText)}
- TECHNICAL_TOPICS: ${deepClean(materialsText)}

### JSON STRUCTURE TO FOLLOW (STRICT):
{
  "titlePage": { 
    "workshopName": "${report.workshopTitle}", 
    "college": "${(report.collegeId as any)?.name || ''}", 
    "department": "${report.department}", 
    "dateRange": "Formatted date range string", 
    "naacCriterion": "${report.naacCriterion}" 
  },
  "introduction": "Synthesized academic introduction (150+ words)",
  "sessionDetails": { 
    "resourcePersons": ${JSON.stringify(report.resourcePersons || [])}, 
    "summary": "Detailed session and resource person summary",
    "supportingDocs": { "officialNotice": true, "attendanceSheet": true, "photos": ${report.photoUrls.length} } 
  },
  "participantProfile": { "local": ${localParticipants}, "outstation": ${report.outstationParticipants || 0}, "total": ${localParticipants + (report.outstationParticipants || 0)}, "summary": "Analysis of the participant group" },
  "feedbackSummary": "Synthesis of student and faculty feedback (100+ words)",
  "outcome": "Mapping curriculum topics to actual outcomes (100+ words)"
}
`;

      await checkStatus();
      this.logger.log(`Requesting AI generation from Groq for: ${report.workshopTitle}`);
      const generatedData = await this.groqService.generateJson(prompt);
      report.aiProgress = 90;
      await report.save();
      await checkStatus();

      // 3. COMPLETION
      report.generatedReport = { ...generatedData, generatedAt: new Date() };
      report.localParticipants = localParticipants;
      report.aiStatus = 'COMPLETED';
      report.aiProgress = 100;
      report.status = 'PENDING_REVIEW';
      await report.save();

      return { success: true };

    } catch (error) {
      if (error.message === 'STOPPED_BY_USER') {
        return { success: false, reason: 'MANUALLY_STOPPED' };
      }
      this.logger.error(`Failed to process NAAC report ${reportId}: ${error.message}`);
      report.aiStatus = 'FAILED';
      await report.save();
      throw error;
    }
  }
}
