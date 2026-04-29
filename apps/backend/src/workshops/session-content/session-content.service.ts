import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Day } from './schemas/day.schema';
import { Session, SessionMaterial } from './schemas/session.schema';
import { SessionContent } from './schemas/session-content.schema';
import { Workshop } from '../workshop.schema';
import { McqAttempt } from './schemas/mcq-attempt.schema';
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
    @InjectModel(McqAttempt.name) private mcqAttemptModel: Model<McqAttempt>,
    private readonly aiClient: AIServiceClient,
    private readonly pdfService: PDFService,
  ) { }

  async validateRegistration(workshopId: string, studentId: string) {
    const workshop = await this.workshopModel.findById(workshopId);
    if (!workshop) throw new NotFoundException('Workshop not found');

    const isRegistered = workshop.registeredStudentIds.some(
      (rid: any) => rid.toString() === studentId.toString()
    );

    if (!isRegistered) {
      throw new ForbiddenException('Access denied: You are not officially registered for this workshop.');
    }
  }

  async createDay(workshopId: string, date: Date, dayNumber: number) {
    const day = await this.dayModel.create({
      workshopId: new Types.ObjectId(workshopId),
      date,
      dayNumber,
    });
    return day;
  }

  async getDaysByWorkshop(workshopId: string) {
    return this.dayModel.find({ workshopId: new Types.ObjectId(workshopId) }).sort({ dayNumber: 1 });
  }

  async deleteDay(dayId: string) {
    const day = await this.dayModel.findById(dayId);
    if (!day) throw new NotFoundException('Day not found');
    const sessions = await this.sessionModel.find({ dayId: new Types.ObjectId(dayId) });
    for (const session of sessions) {
      await this.deleteSession(session._id.toString());
    }
    await this.dayModel.findByIdAndDelete(dayId);
    return { success: true };
  }

  async createSession(workshopId: string, dayId: string, title: string, materials?: any[]) {
    return this.sessionModel.create({
      workshopId: new Types.ObjectId(workshopId),
      dayId: new Types.ObjectId(dayId),
      title,
      materials: materials || [],
    });
  }

  async getFullWorkshopStructure(workshopId: string, studentId?: string, userRole?: string) {
    const days = await this.dayModel.find({ workshopId: new Types.ObjectId(workshopId) }).sort({ dayNumber: 1 });
    const fullStructure: any[] = [];

    const isStaff = userRole === 'INSTRUCTOR' || userRole === 'COLLEGE_ADMIN' || userRole === 'TEACHER' || userRole === 'SUPER_ADMIN';

    for (const day of days) {
      const sessions = await this.sessionModel.find({ dayId: day._id });
      const sessionsWithAI = await Promise.all(sessions.map(async (s) => {
        const sessionObj = s.toObject();
        const contentList = await this.contentModel.find({ sessionId: s._id });
        
        let materials = sessionObj.materials.map(m => {
          return {
            ...m,
            isPublished: (m as any).isPublished || false
          };
        });

        // If student, filter out unpublished materials
        if (!isStaff) {
          materials = materials.filter(m => m.isPublished);
        }
        
        (sessionObj as any).materials = materials;
        (sessionObj as any).aiContent = isStaff ? contentList : contentList.filter(c => (c as any).isPublished === true);
        return sessionObj;
      }));

      fullStructure.push({
        ...day.toObject(),
        sessions: sessionsWithAI
      });
    }

    return fullStructure;
  }

  async getSessionsByDay(dayId: string) {
    return this.sessionModel.find({ dayId: new Types.ObjectId(dayId) });
  }

  async extractPreview(sessionId: string, materialUrl: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const material = session.materials.find(m => m.url === materialUrl);
    if (!material) throw new NotFoundException('Material not found');

    let syllabusText = "";
    const isOffice = materialUrl.toLowerCase().endsWith('.pptx') || materialUrl.toLowerCase().endsWith('.ppt') || materialUrl.toLowerCase().endsWith('.docx');
    const absolutePath = materialUrl.startsWith('/') ? `.${materialUrl}` : materialUrl;

    try {
      if (isOffice) {
        syllabusText = await this.pdfService.extractFromOffice(absolutePath);
      } else {
        const buffer = await fs.readFile(absolutePath);
        syllabusText = await this.pdfService.extractText(buffer);
      }
    } catch (e) {
      console.error('Extraction failed:', e);
    }

    return {
      topic: material.title,
      audience: "BE Mechanical", // Default as per user's example
      syllabus: syllabusText || ""
    };
  }

  async triggerGeneration(sessionId: string, customTopic?: string, customAudience?: string, materialId?: string, materialUrl?: string, syllabusOverride?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    let sourceMaterialIndex = -1;
    if (materialUrl) {
      sourceMaterialIndex = session.materials.findIndex(m => m.url === materialUrl);
    } else if (materialId) {
      sourceMaterialIndex = session.materials.findIndex(m => (m as any)._id?.toString() === materialId);
    }

    if (sourceMaterialIndex === -1) {
      throw new BadRequestException('Please select a specific file to generate curriculum from.');
    }

    const sourceMaterial = session.materials[sourceMaterialIndex];

    // Update all materials to ensure only one is source, and set status to generating
    session.materials.forEach((m, idx) => {
      m.isSourceForAI = (idx === sourceMaterialIndex);
    });
    session.materials[sourceMaterialIndex].status = 'generating';
    session.markModified('materials');
    await session.save();

    const topic = customTopic || sourceMaterial.title || session.title;
    const audience = customAudience || "General";

    // FIRE AND FORGET: Start background generation
    this.processBackgroundGeneration(sessionId, sourceMaterial, topic, audience, syllabusOverride)
      .catch(err => console.error(`[BACKGROUND GEN ERROR] Session ${sessionId}:`, err));

    return { 
      success: true, 
      message: 'Generation started in background',
      status: 'generating'
    };
  }

  private async processBackgroundGeneration(sessionId: string, sourceMaterial: any, topic: string, audience: string, syllabusOverride?: string) {
    try {
      let syllabusText = syllabusOverride || "";
      
      if (!syllabusText) {
        const url = sourceMaterial.url;
        const isOffice = url.toLowerCase().endsWith('.pptx') || url.toLowerCase().endsWith('.ppt') || url.toLowerCase().endsWith('.docx');
        const absolutePath = url.startsWith('/') ? `.${url}` : url;

        if (isOffice) {
          syllabusText = await this.pdfService.extractFromOffice(absolutePath);
        } else {
          const buffer = await fs.readFile(absolutePath);
          syllabusText = await this.pdfService.extractText(buffer);
        }
      }

      if (!syllabusText || syllabusText.length < 10) {
        syllabusText = `Topic: ${topic}. Audience: ${audience}. Generate content based on this topic.`;
      }

      const aiResponse = await this.aiClient.startGeneration({
        syllabus: syllabusText,
        audience: audience,
        topic: topic,
      });

      const updatedSession = await this.sessionModel.findById(sessionId);
      if (updatedSession) {
        const matIdx = updatedSession.materials.findIndex(m => m.url === sourceMaterial.url);
        if (matIdx !== -1) {
          updatedSession.materials[matIdx].aiSessionId = aiResponse.session_id;
          updatedSession.materials[matIdx].aiWorkflowStage = 'Stage1';
          updatedSession.materials[matIdx].status = 'generated';
          updatedSession.markModified('materials');
          await updatedSession.save();
        }
      }

      const generatedData = aiResponse.content || aiResponse.data;
      await this.saveGeneratedContent(
        sessionId,
        generatedData?.mcqs || [],
        generatedData?.application_problem || generatedData?.applicationProblem,
        generatedData?.slides || [],
        generatedData?.materials || [],
        sourceMaterial.title,
        sourceMaterial.url,
        aiResponse.session_id,
        (sourceMaterial as any)._id?.toString(),
        topic,
        audience
      );

      console.log(`[BACKGROUND GEN] Success for session ${sessionId}`);
    } catch (error) {
      console.error(`[BACKGROUND GEN] Failed for session ${sessionId}:`, error);
      const failedSession = await this.sessionModel.findById(sessionId);
      if (failedSession) {
        const matIdx = failedSession.materials.findIndex(m => m.url === sourceMaterial.url);
        if (matIdx !== -1) {
          failedSession.materials[matIdx].status = 'failed';
          failedSession.markModified('materials');
          await failedSession.save();
        }
      }
    }
  }


  async reviewStage1(sessionId: string, action: 'continue' | 'edit', editedData?: any, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const materialIndex = session.materials.findIndex(m => {
      if (materialId) return (m as any)._id?.toString() === materialId;
      return m.aiWorkflowStage === 'Stage1' && m.aiSessionId;
    });
    if (materialIndex === -1) throw new NotFoundException('No material in Stage 1 review found');
    const material = session.materials[materialIndex];

    if (action === 'edit' && editedData) {
      // Sanitize the payload: AI service only wants curriculum data
      const sanitized = this.sanitizeAIPayload(editedData);
      
      if (sanitized.mcqs) {
        sanitized.mcqs = sanitized.mcqs.map((q: any) => ({
          ...q,
          concept: q.concept || "General Concept",
          difficulty: q.difficulty || "medium",
          learning_objective: q.learning_objective || q.learning_objective || "General understanding"
        }));
      }
      editedData = sanitized;
    }

    const aiResponse = await this.aiClient.reviewStage1(material.aiSessionId!, action, editedData);
    session.materials[materialIndex].aiWorkflowStage = 'Stage2';
    session.markModified('materials');
    await session.save();

    const stage2Data = aiResponse.content || aiResponse.data;
    await this.saveGeneratedContent(
      sessionId,
      stage2Data?.mcqs || [],
      stage2Data?.application_problem || stage2Data?.applicationProblem,
      stage2Data?.slides || [],
      stage2Data?.materials || [],
      session.title,
      material.url,
      material.aiSessionId,
      (material as any)._id?.toString()
    );
    return aiResponse;
  }

  async reviewStage2(sessionId: string, action: 'continue' | 'edit', editedData?: any, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const materialIndex = session.materials.findIndex(m => {
      if (materialId) return (m as any)._id?.toString() === materialId;
      return m.aiWorkflowStage === 'Stage2' && m.aiSessionId;
    });
    if (materialIndex === -1) throw new NotFoundException('No material in Stage 2 review found');
    const material = session.materials[materialIndex];

    if (action === 'edit' && editedData) {
      // Sanitize the payload: AI service only wants curriculum data
      const sanitized = this.sanitizeAIPayload(editedData);
      
      if (sanitized.mcqs) {
        sanitized.mcqs = sanitized.mcqs.map((q: any) => ({
          ...q,
          concept: q.concept || "General Concept",
          difficulty: q.difficulty || "medium",
          learning_objective: q.learning_objective || q.learning_objective || "General understanding"
        }));
      }
      editedData = sanitized;
    }

    await this.aiClient.reviewStage2(material.aiSessionId!, action, editedData);
    const aiResponse = await this.aiClient.getFinalOutput(material.aiSessionId!);
    const finalData = aiResponse.content || aiResponse.data || aiResponse;

    session.materials[materialIndex].aiWorkflowStage = 'Finalized';
    session.materials[materialIndex].status = 'generated';
    session.markModified('materials');
    await session.save();

    await this.saveGeneratedContent(
      sessionId,
      finalData.mcqs || [],
      finalData.application_problem || finalData.applicationProblem,
      finalData.slides || [],
      finalData.materials || [],
      session.title,
      material.url,
      material.aiSessionId,
      (material as any)._id?.toString()
    );
    return finalData;
  }

  async approveContent(sessionId: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    const matIdx = session.materials.findIndex(m => (m as any)._id?.toString() === materialId);
    if (matIdx !== -1) {
      session.materials[matIdx].status = 'approved';
      session.markModified('materials');
      await session.save();
    }
    return session;
  }

  async toggleContentPublish(sessionId: string, materialId: string) {
    const content = await this.contentModel.findOne({ 
      sessionId: new Types.ObjectId(sessionId),
      materialId: materialId
    });
    if (!content) throw new NotFoundException('Content not found');
    
    (content as any).isPublished = !(content as any).isPublished;
    await content.save();
    return content;
  }

  async getSessionContent(sessionId: string, userRole?: string, userId?: string, materialId?: string, publishedOnly?: boolean) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === 'STUDENT' && userId) {
      await this.validateRegistration(session.workshopId.toString(), userId);
    }

    const staffRoles = ['INSTRUCTOR', 'COLLEGE_ADMIN', 'TEACHER', 'SUPER_ADMIN'];
    const isInstructor = userRole ? staffRoles.includes(userRole) : false;
    
    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (materialId) query.materialId = materialId;

    const contents = await this.contentModel.find(query);
    console.log(`[SessionContent] Fetching for role: ${userRole}, isInstructor: ${isInstructor}, publishedOnly: ${publishedOnly}, count: ${contents.length}`);

    if (!isInstructor || publishedOnly) {
      const filtered = contents.filter(c => (c as any).isPublished === true);
      console.log(`[SessionContent] Filtered from ${contents.length} to ${filtered.length} (publishedOnly: ${publishedOnly})`);
      return filtered;
    }
    return contents;
  }

  private sanitizeAIPayload(data: any) {
    // Extract only the fields the AI service expects
    const sanitized: any = {};
    
    // Support both application_problem (AI service) and applicationProblem (our DB)
    const appProb = data.application_problem || data.applicationProblem;
    if (appProb) {
      sanitized.application_problem = {
        title: appProb.title,
        problem_statement: appProb.problem_statement || appProb.description || appProb.content,
        expected_time_minutes: appProb.expected_time_minutes || 10,
        concepts_used: appProb.concepts_used || [],
        solution_steps: appProb.solution_steps || [],
        final_answer: appProb.final_answer || "",
        grading_rubric: appProb.grading_rubric || []
      };
    }

    if (data.mcqs) {
      sanitized.mcqs = data.mcqs.map((q: any) => ({
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        concept: q.concept,
        difficulty: q.difficulty,
        learning_objective: q.learning_objective || q.learningObjective
      }));
    }

    if (data.slides) {
      sanitized.slides = data.slides;
    }

    return sanitized;
  }

  async updateSessionStatus(sessionId: string, status: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) return;

    if (materialId) {
      const matIdx = session.materials.findIndex(m => (m as any)._id?.toString() === materialId);
      if (matIdx !== -1) {
        session.materials[matIdx].status = status;
        session.markModified('materials');
        await session.save();
      }
    } else {
      // Fallback: update the material marked as isSourceForAI
      const matIdx = session.materials.findIndex(m => m.isSourceForAI);
      if (matIdx !== -1) {
        session.materials[matIdx].status = status;
        session.markModified('materials');
        await session.save();
      }
    }
  }

  async saveGeneratedContent(
    sessionId: string, 
    mcqs: any[], 
    applicationProblem?: any, 
    slides?: any, 
    materials: any[] = [], 
    sourceMaterialTitle?: string, 
    sourceMaterialUrl?: string, 
    aiSessionId?: string,
    materialId?: string,
    topic?: string,
    audience?: string
  ) {
    const normalizedMcqs = mcqs.map(q => {
      if (q.correctAnswer !== undefined) return q;
      const options = q.options || [];
      const correctStr = q.correct || q.correctAnswerStr || "";
      const index = options.findIndex((opt: string) => opt === correctStr);
      return { ...q, correctAnswer: index !== -1 ? index : 0 };
    });

    const update: any = { mcqs: normalizedMcqs, applicationProblem, slides, materials };
    if (sourceMaterialTitle) update.sourceMaterialTitle = sourceMaterialTitle;
    if (sourceMaterialUrl) update.sourceMaterialUrl = sourceMaterialUrl;
    if (aiSessionId) update.aiSessionId = aiSessionId;
    if (materialId) update.materialId = materialId;
    if (topic) update.topic = topic;
    if (audience) update.audience = audience;

    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (materialId) query.materialId = materialId;
    else if (sourceMaterialUrl) query.sourceMaterialUrl = sourceMaterialUrl;

    const existing = await this.contentModel.findOne(query);
    if (!existing) {
      update.isPublished = false;
    }

    await this.contentModel.findOneAndUpdate(query, update, { upsert: true });
  }

  async deleteSession(sessionId: string) {
    await this.contentModel.deleteMany({ sessionId: new Types.ObjectId(sessionId) });
    await this.sessionModel.findByIdAndDelete(sessionId);
    return { success: true };
  }

  async deleteSessionContent(sessionId: string, materialId?: string) {
    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (materialId) query.materialId = materialId;
    await this.contentModel.deleteMany(query);

    const session = await this.sessionModel.findById(sessionId);
    if (session) {
      session.materials.forEach(m => {
        if (!materialId || (m as any)._id?.toString() === materialId) {
          m.status = 'pending';
          m.aiWorkflowStage = 'Draft';
          m.aiSessionId = undefined;
        }
      });
      session.markModified('materials');
      await session.save();
    }
    return { success: true };
  }

  async updateSession(sessionId: string, data: { title?: string, materials?: any[], isSourceForAI?: boolean, materialUrl?: string }) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (data.title) session.title = data.title;
    if (data.materials) session.materials = data.materials;
    await session.save();
    return session;
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
    if (material) {
      material.isPublished = !material.isPublished;
      session.markModified('materials');
      await session.save();
    }
    return session;
  }

  async submitMcqAttempt(userId: string, sessionId: string, materialId: string, score: number, totalQuestions: number) {
    // Get existing attempts
    const attempts = await this.mcqAttemptModel.find({
      userId: new Types.ObjectId(userId),
      sessionId: new Types.ObjectId(sessionId),
      materialId: materialId
    }).sort({ attemptNumber: -1 });

    const attemptNumber = attempts.length + 1;
    if (attemptNumber > 3) {
      throw new BadRequestException('Maximum attempts (3) reached for this quiz.');
    }

    const isPassed = score === totalQuestions; // Clear with full score

    const newAttempt = await this.mcqAttemptModel.create({
      userId: new Types.ObjectId(userId),
      sessionId: new Types.ObjectId(sessionId),
      materialId: materialId,
      score,
      totalQuestions,
      attemptNumber,
      isPassed
    });

    return {
      success: true,
      attempt: newAttempt,
      attemptsRemaining: 3 - attemptNumber,
      betterLuckNextTime: attemptNumber === 3 && !isPassed
    };
  }

  async getMcqStatus(userId: string, sessionId: string, materialId: string) {
    const attempts = await this.mcqAttemptModel.find({
      userId: new Types.ObjectId(userId),
      sessionId: new Types.ObjectId(sessionId),
      materialId: materialId
    }).sort({ attemptNumber: 1 });

    const passedAttempt = attempts.find(a => a.isPassed);
    const lastAttempt = attempts[attempts.length - 1];
    
    return {
      attempts: attempts.length,
      attemptsRemaining: 3 - attempts.length,
      isPassed: !!passedAttempt,
      bestScore: attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0,
      totalQuestions: attempts.length > 0 ? attempts[0].totalQuestions : 0,
      status: passedAttempt ? 'SOLVED' : (attempts.length >= 3 ? 'FAILED' : 'PENDING'),
      lastScore: lastAttempt ? lastAttempt.score : null
    };
  }

  async getWorkshopMcqAnalytics(workshopId: string) {
    // 1. Get all sessions for this workshop
    const sessions = await this.sessionModel.find({ workshopId: new Types.ObjectId(workshopId) });
    const sessionIds = sessions.map(s => s._id);

    // 2. Get all attempts for these sessions
    const attempts = await this.mcqAttemptModel.find({
      sessionId: { $in: sessionIds }
    }).populate('userId', 'name email');

    return attempts;
  }

  async getStudentMcqSummary(userId: string) {
    const attempts = await this.mcqAttemptModel.find({
      userId: new Types.ObjectId(userId)
    });

    const totalQuizzes = new Set(attempts.map(a => `${a.sessionId}-${a.materialId}`)).size;
    const passedQuizzes = new Set(attempts.filter(a => a.isPassed).map(a => `${a.sessionId}-${a.materialId}`)).size;
    
    const scores = attempts.map(a => (a.score / a.totalQuestions) * 100);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      totalQuizzes,
      passedQuizzes,
      avgScore
    };
  }
}
