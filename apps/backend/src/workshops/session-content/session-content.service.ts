import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Day } from './schemas/day.schema';
import { Session } from './schemas/session.schema';
import { SessionContent } from './schemas/session-content.schema';
import { Workshop } from '../workshop.schema';
import { AIServiceClient } from './ai-service.client';
import { PDFService } from '../../infrastructure/pdf/pdf.service';
import * as fs from 'fs/promises';

@Injectable()
export class SessionContentService {
  constructor(
    @InjectModel(Day.name) private dayModel: Model<Day>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(SessionContent.name) private contentModel: Model<SessionContent>,
    @InjectModel(Workshop.name) private workshopModel: Model<Workshop>,
    private readonly aiClient: AIServiceClient,
    private readonly pdfService: PDFService,
  ) {}

  async createDay(workshopId: string, date: Date, dayNumber: number) {
    return this.dayModel.create({
      workshopId: new Types.ObjectId(workshopId),
      date,
      dayNumber,
    });
  }

  async getDaysByWorkshop(workshopId: string) {
    return this.dayModel.find({ workshopId: new Types.ObjectId(workshopId) }).sort({ dayNumber: 1 });
  }

  async createSession(workshopId: string, dayId: string, title: string, materials?: any[]) {
    return this.sessionModel.create({
      workshopId: new Types.ObjectId(workshopId),
      dayId: new Types.ObjectId(dayId),
      title,
      materials: materials || [],
      status: 'pending',
    });
  }

  async getSessionsByDay(dayId: string) {
    return this.sessionModel.find({ dayId: new Types.ObjectId(dayId) });
  }

  async getFullWorkshopStructure(workshopId: string) {
    const workshop = await this.workshopModel.findById(workshopId);
    if (!workshop) throw new NotFoundException('Workshop not found');

    // Auto-initialize days if they don't exist
    if (workshop.schedule?.start && workshop.schedule?.end) {
      const start = new Date(workshop.schedule.start);
      const end = new Date(workshop.schedule.end);
      
      // Calculate number of days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      for (let i = 1; i <= diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + (i - 1));

        const existingDay = await this.dayModel.findOne({
          workshopId: new Types.ObjectId(workshopId),
          dayNumber: i,
        });

        if (!existingDay) {
          await this.dayModel.create({
            workshopId: new Types.ObjectId(workshopId),
            dayNumber: i,
            date: currentDate,
          });
        }
      }
    }

    const days = await this.getDaysByWorkshop(workshopId);
    const result: any[] = [];
    for (const day of days) {
      const sessions = await this.getSessionsByDay(day._id.toString() as string);
      result.push({
        ...day.toObject(),
        sessions,
      });
    }
    return result;
  }

  async triggerGeneration(sessionId: string) {
    // 1. Get session and identify source material - Use lean() to get fresh data
    const session = await this.sessionModel.findById(sessionId).lean();
    if (!session) throw new NotFoundException('Session not found');
    
    // Find source material
    const sourceMaterial = session.materials.find(m => m.isSourceForAI);
    const titleToUse = sourceMaterial ? sourceMaterial.title : "Original Material";
    console.log(`[AI Generation] Triggering for: ${titleToUse}`);
    const filePath = sourceMaterial ? sourceMaterial.filePath : session.filePath;

    if (!filePath) throw new BadRequestException('Source file is required for generation');

    // Update status to processing - Atomic update
    await this.sessionModel.findByIdAndUpdate(sessionId, { status: 'generating' });

    try {
      // 1. Extract Text for Syllabus
      let syllabusText = "";
      const isOffice = filePath.toLowerCase().endsWith('.pptx') || 
                       filePath.toLowerCase().endsWith('.ppt') || 
                       filePath.toLowerCase().endsWith('.docx');
      
      if (isOffice) {
        syllabusText = await this.pdfService.extractFromOffice(filePath);
      } else {
        const buffer = await fs.readFile(filePath);
        syllabusText = await this.pdfService.extractText(buffer);
      }

      if (!syllabusText) syllabusText = session.title; // Fallback

      // 2. Get Metadata from Workshop
      const workshop = await this.workshopModel.findById(session.workshopId);
      const audience = workshop?.title || "University Students";

      // 3. Call AI Service - Start Generation
      const aiResponse = await this.aiClient.startGeneration({
        syllabus: syllabusText,
        audience: audience,
        topic: session.title,
      });

      // 4. Update Session with AI ID and Stage
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        aiSessionId: aiResponse.session_id,
        aiWorkflowStage: 'Stage1',
        status: 'generated'
      });

      // 5. Save initial generated content to separate collection
      await this.saveGeneratedContent(
        sessionId, 
        aiResponse.data.mcqs || [], 
        aiResponse.data.application_problem,
        aiResponse.data.slides,
        aiResponse.data.materials || [],
        titleToUse,
        sourceMaterial ? sourceMaterial.url : "default",
        aiResponse.session_id
      );

      return { 
        sessionId: session._id, 
        aiSessionId: aiResponse.session_id,
        stage: 'Stage1',
        status: 'generated'
      };

    } catch (error) {
      await this.sessionModel.findByIdAndUpdate(sessionId, { status: 'failed' });
      throw error;
    }
  }

  async reviewStage1(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session || !session.aiSessionId) throw new NotFoundException('Active AI Session not found');

    const aiResponse = await this.aiClient.reviewStage1(session.aiSessionId, action, editedData);
    
    // Update to next stage
    session.aiWorkflowStage = 'Stage2';
    await session.save();

    // Save potentially modified content
    if (aiResponse.data) {
      await this.saveGeneratedContent(
        sessionId,
        aiResponse.data.mcqs || [],
        aiResponse.data.application_problem,
        aiResponse.data.slides,
        aiResponse.data.materials || [],
        undefined,
        undefined,
        session.aiSessionId
      );
    }

    return { stage: 'Stage2', status: 'review_pending' };
  }

  async reviewStage2(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session || !session.aiSessionId) throw new NotFoundException('Active AI Session not found');

    await this.aiClient.reviewStage2(session.aiSessionId, action, editedData);
    
    // Transition to Final retrieval
    const finalData = await this.aiClient.getFinalOutput(session.aiSessionId);
    
    session.aiWorkflowStage = 'Finalized';
    session.status = 'generated';
    await session.save();

    // Save final output
    await this.saveGeneratedContent(
      sessionId,
      finalData.mcqs || [],
      finalData.application_problem,
      finalData.slides,
      finalData.materials || [],
      undefined,
      undefined,
      session.aiSessionId
    );

    return { stage: 'Finalized', status: 'completed' };
  }

  async approveContent(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // If it's already approved, just return it
    if (session.status === 'approved') return session;

    // Allow approval if generated OR if it's a draft that was skiped
    if (session.status !== 'generated' && session.status !== 'pending') {
      throw new BadRequestException(`Cannot approve session. Current status is: ${session.status}. It must be 'generated' first.`);
    }

    session.status = 'approved';
    await session.save();
    return session;
  }

  async getSessionContent(sessionId: string, userRole?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const isInstructor = userRole === 'INSTRUCTOR' || userRole === 'COLLEGE_ADMIN';

    // Status Guard: Only allow if approved AND (if AI was involved) finalized
    // EXCEPT for instructors/admins who are reviewing content
    if (!isInstructor) {
      if (session.status !== 'approved') return null;
      if (session.aiWorkflowStage && session.aiWorkflowStage !== 'Finalized') return null;
    }

    return this.contentModel.find({ sessionId: new Types.ObjectId(sessionId) });
  }

  async updateSessionStatus(sessionId: string, status: string, jobId?: string) {
    const update: any = { status };
    if (jobId) update.jobId = jobId;
    await this.sessionModel.findByIdAndUpdate(sessionId, update);
  }

  async saveGeneratedContent(sessionId: string, mcqs: any[], applicationProblem?: any, slides?: any, materials: any[] = [], sourceMaterialTitle?: string, sourceMaterialUrl?: string, aiSessionId?: string) {
    const update: any = { mcqs, applicationProblem, slides, materials };
    if (sourceMaterialTitle) update.sourceMaterialTitle = sourceMaterialTitle;
    if (sourceMaterialUrl) update.sourceMaterialUrl = sourceMaterialUrl;
    if (aiSessionId) update.aiSessionId = aiSessionId;

    // Use aiSessionId as the primary key if available to avoid overwriting other passes
    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (aiSessionId) {
      query.aiSessionId = aiSessionId;
    } else if (sourceMaterialUrl) {
      query.sourceMaterialUrl = sourceMaterialUrl;
    }

    await this.contentModel.findOneAndUpdate(
      query,
      update,
      { upsert: true, new: true }
    );
  }

  async deleteSession(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    // Remove associated content
    await this.contentModel.deleteMany({ sessionId: new Types.ObjectId(sessionId) });
    
    // Remove session
    await this.sessionModel.findByIdAndDelete(sessionId);
    
    return { success: true };
  }

  async updateSession(sessionId: string, data: { title?: string, materials?: any[], isSourceForAI?: boolean, materialUrl?: string }) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (data.title) session.title = data.title;
    
    // 1. If new materials are uploaded, APPEND them instead of replacing (unless it's an explicit replace)
    if (data.materials && data.materials.length > 0) {
      session.materials.push(...data.materials);
    }

    // 2. If we just want to toggle source for an EXTISTING material
    if (data.materialUrl) {
      // Robust Toggle: Create a fresh array with all flags cleared except the target
      const updatedMaterials = session.materials.map(m => {
        const url1 = m.url.replace(/^\/+/, '');
        const url2 = data.materialUrl?.replace(/^\/+/, '');
        const isMatch = url1 === url2;
        return { 
          ...(m as any).toObject ? (m as any).toObject() : m, 
          isSourceForAI: isMatch ? !!data.isSourceForAI : false 
        };
      });
      
      const updatedSession = await this.sessionModel.findByIdAndUpdate(
        sessionId, 
        { $set: { materials: updatedMaterials } }, 
        { new: true }
      );
      return updatedSession;
    }
  }

  async addMaterials(sessionId: string, materials: any[]) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    session.materials.push(...materials);
    await session.save();
    return session;
  }

  async removeMaterial(sessionId: string, materialUrl: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    session.materials = session.materials.filter(m => m.url !== materialUrl);
    await session.save();
    return session;
  }

  async toggleMaterialPublish(sessionId: string, materialUrl: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const material = session.materials.find(m => m.url === materialUrl);
    if (!material) throw new NotFoundException('Material not found');

    material.isPublished = !material.isPublished;
    await session.save();
    return session;
  }
}
