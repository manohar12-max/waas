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

      const prompt = `
        ### ROLE: NAAC Documentation Specialist
        ### TASK: Generate a formal, high-fidelity NAAC Activity Report JSON.
        
        ### CONTEXT:
        - INSTITUTION: ${(report.collegeId as any)?.name || 'The Institution'}
        - WORKSHOP: ${report.workshopTitle}
        - DEPARTMENT: ${report.department}
        - DATES: ${report.startDate} to ${report.endDate}
        - NAAC CRITERION: ${report.naacCriterion}
        
        ### DATA SOURCES:
        - ATTENDANCE: ${localParticipants} students.
        - STUDENT FEEDBACK: ${feedbackComments.substring(0, 1500)}
        - FACULTY/MANUAL SUMMARY: ${report.feedbackSummary || ''}
        - OFFICIAL CIRCULAR: ${report.draftNoticeSummary || circularText.substring(0, 2000)}
        - IMAGE EVIDENCE: ${report.draftImagesSummary || `Visual evidence confirms ${report.photoUrls.length} key moments captured.`}
        - EXTRACTED TOPICS: ${report.draftMaterialsSummary || materialsText.substring(0, 3000)}
        - RESOURCE PERSONS: ${JSON.stringify(report.resourcePersons || [])}
        - GRADING POLICY: ${JSON.stringify(workshop.gradingConfig || {})}
        
        ### INSTRUCTIONS:
        1. **Tone**: Objective, formal, and strictly academic. Avoid marketing language/buzzwords.
        2. **Dates**: Use professional formats like "23rd April 2026" or "23rd - 25th April 2026". 
           - CRITICAL: Never include technical UTC/GMT time strings (e.g., "10:17:00 GMT+0530").
        3. **Introduction (150+ words)**: Synthesize the workshop title with extracted topics. Mention the specific technological or academic relevance as found in the extract materials.
        4. **Feedback Synthesis (100+ words)**: Cohesively combine student feedback comments with the Faculty's manual summary. Reflect on both participant satisfaction and areas of technical growth.
        5. **Outcomes (100+ words)**: Map the workshop outcomes to the grading policy and extracted curriculum topics. Detail what the participants actually gained.
        
        ### JSON STRUCTURE:
        {
          "titlePage": { 
            "workshopName": "${report.workshopTitle}", 
            "college": "${(report.collegeId as any)?.name || ''}", 
            "department": "${report.department}", 
            "dateRange": "string", 
            "naacCriterion": "${report.naacCriterion}" 
          },
          "introduction": "string",
          "sessionDetails": { 
            "resourcePersons": [{ "name": "Name", "designation": "Designation", "topic": "Topic" }], 
            "summary": "Synthesized summary of sessions and resource person contributions.",
            "supportingDocs": { "officialNotice": true, "attendanceSheet": true, "photos": ${report.photoUrls.length} } 
          },
          "participantProfile": { "local": ${localParticipants}, "outstation": ${report.outstationParticipants || 0}, "total": ${localParticipants + (report.outstationParticipants || 0)}, "summary": "string" },
          "feedbackSummary": "string",
          "outcome": "string"
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
