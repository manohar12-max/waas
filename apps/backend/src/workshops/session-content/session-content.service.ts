import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { Day } from './schemas/day.schema';
import { Session } from './schemas/session.schema';
import { SessionContent } from './schemas/session-content.schema';
import { Workshop } from '../workshop.schema';

@Injectable()
export class SessionContentService {
  constructor(
    @InjectModel(Day.name) private dayModel: Model<Day>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(SessionContent.name) private contentModel: Model<SessionContent>,
    @InjectModel(Workshop.name) private workshopModel: Model<Workshop>,
    @InjectQueue('session-content-generation') private generationQueue: Queue,
    private readonly httpService: HttpService,
  ) { }

  async createDay(workshopId: string, date: Date, dayNumber: number) {
    return this.dayModel.create({
      workshopId: new Types.ObjectId(workshopId),
      date,
      dayNumber,
    });
  }

  async getDaysByWorkshop(workshopId: string) {
    return this.dayModel.find({ workshopId: new Types.ObjectId(workshopId) }).sort({ dayNumber: 1 }).lean();
  }

  async createSession(workshopId: string, dayId: string, title: string, rawContentUrl?: string, filePath?: string) {
    return this.sessionModel.create({
      workshopId: new Types.ObjectId(workshopId),
      dayId: new Types.ObjectId(dayId),
      title,
      rawContentUrl,
      filePath,
      status: 'pending',
    });
  }

  async getSessionById(sessionId: string) {
    return this.sessionModel.findById(sessionId);
  }

  async getSessionsByDay(dayId: string) {
    if (!Types.ObjectId.isValid(dayId)) return [];
    return this.sessionModel.find({ dayId: new Types.ObjectId(dayId) }).lean();
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
      const sessions = await this.getSessionsByDay((day as any)._id.toString());
      result.push({
        ...day,
        sessions,
      });
    }
    return result;
  }

  async triggerGeneration(sessionId: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    let rawContentUrl = session.rawContentUrl;
    let targetStatus = 'generating';

    if (materialId) {
      const material = session.materials.find(m => m._id.toString() === materialId);
      if (!material) throw new NotFoundException('Material not found');
      rawContentUrl = material.filePath;
      material.status = 'generating';
      session.markModified('materials');
    } else {
      if (!rawContentUrl) throw new BadRequestException('Raw content URL is required for generation');
      session.status = 'generating';
    }

    await session.save();

    const job = await this.generationQueue.add('generate', {
      sessionId,
      materialId,
      rawContentUrl,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    if (materialId) {
      const material = session.materials.find(m => m._id.toString() === materialId);
      material.jobId = job.id;
      session.markModified('materials');
    } else {
      session.jobId = job.id;
    }
    await session.save();

    return { jobId: job.id, status: 'generating' };
  }

  async approveContent(sessionId: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (materialId) {
      const material = session.materials.find(m => m._id.toString() === materialId);
      if (!material) throw new NotFoundException('Material not found');
      material.status = 'approved';
      session.markModified('materials');
    } else {
      session.status = 'approved';
    }

    await session.save();
    return session;
  }

  async getSessionContent(sessionId: string, materialId?: string) {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException(`Invalid session ID: ${sessionId}`);
    }
    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (materialId && Types.ObjectId.isValid(materialId)) {
      query.materialId = new Types.ObjectId(materialId);
    }
    return this.contentModel.findOne(query);
  }

  async updateSessionStatus(sessionId: string, status: string, jobId?: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) return;

    if (materialId) {
      const material = session.materials.find(m => m._id.toString() === materialId);
      if (material) {
        material.status = status;
        if (jobId) material.jobId = jobId;
        session.markModified('materials');
      }
    } else {
      session.status = status;
      if (jobId) session.jobId = jobId;
    }
    await session.save();
  }

  async saveGeneratedContent(sessionId: string, mcqs: any[], materials: any[], materialId?: string, applicationProblem?: any, slides?: any) {
    if (!Types.ObjectId.isValid(sessionId)) return;
    const query: any = { sessionId: new Types.ObjectId(sessionId) };
    if (materialId && Types.ObjectId.isValid(materialId)) {
      query.materialId = new Types.ObjectId(materialId);
    }

    await this.contentModel.findOneAndUpdate(
      query,
      { mcqs, materials, applicationProblem, slides },
      { upsert: true, new: true }
    );
  }

  async updateAISessionInfo(sessionId: string, aiSessionId: string, aiStage: string) {
    await this.sessionModel.findByIdAndUpdate(sessionId, {
      aiSessionId,
      aiStage
    });
  }

  async reviewAIContent(sessionId: string, stage: 1 | 2, action: 'continue' | 'edit', editedData?: any) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session || !session.aiSessionId) throw new NotFoundException('AI Session not found');

    const aiUrl = process.env.AI_SERVICE_URL || "http://59.90.46.174:4000";
    const endpoint = stage === 1 ? 'review-stage-1' : 'review-stage-2';

    const response = await this.httpService.axiosRef.post(`${aiUrl}/${endpoint}`, {
      session_id: session.aiSessionId,
      action,
      edited_data: editedData
    });

    const nextStage = stage === 1 ? 'stage2' : 'final';
    await this.sessionModel.findByIdAndUpdate(sessionId, { aiStage: nextStage });

    // If there's new data in response, update it
    if (response.data && response.data.data) {
      await this.saveGeneratedContent(
        sessionId, 
        response.data.data.mcqs, 
        response.data.data.materials || [],
        undefined,
        response.data.data.application_problem,
        response.data.data.slides
      );
    }

    return response.data;
  }

  async fetchAIFinalOutput(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session || !session.aiSessionId) throw new NotFoundException('AI Session not found');

    const aiUrl = process.env.AI_SERVICE_URL || "http://59.90.46.174:4000";
    const response = await this.httpService.axiosRef.get(`${aiUrl}/final-output/${session.aiSessionId}`);

    const finalData = response.data;
    if (finalData) {
      await this.saveGeneratedContent(
        sessionId, 
        finalData.mcqs, 
        finalData.materials || [], 
        undefined, 
        finalData.application_problem, 
        finalData.slides
      );
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        status: 'generated',
        aiStage: 'completed'
      });
    }

    return finalData;
  }

  async addMaterial(sessionId: string, title: string, filePath: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const material = {
      _id: new Types.ObjectId(),
      title,
      filePath,
      status: 'pending',
      isPublished: false,
      updatedAt: new Date()
    };

    session.materials.push(material);
    await session.save();
    return session;
  }

  async publishMaterial(sessionId: string, materialId?: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (materialId) {
      const material = session.materials.find(m => m._id.toString() === materialId);
      if (material) material.isPublished = !material.isPublished;
      session.markModified('materials');
    } else {
      session.isMaterialPublished = !session.isMaterialPublished;
    }

    await session.save();
    return session;
  }

  async publishContent(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    session.isContentPublished = !session.isContentPublished;
    await session.save();
    return session;
  }

  async deleteSession(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    await this.contentModel.deleteMany({ sessionId: new Types.ObjectId(sessionId) });
    await this.sessionModel.findByIdAndDelete(sessionId);

    return { success: true };
  }

  async getPublishedContentForWorkshop(workshopId: string) {
    const sessions = await this.sessionModel
      .find({ workshopId: new Types.ObjectId(workshopId) })
      .populate('workshopId')
      .lean();

    const publishedItems: any[] = [];

    for (const session of sessions) {
      const workshop = session.workshopId as any;
      const instructorName = workshop?.instructorId?.name || "Instructor";

      // 1. Primary Material
      if (session.isMaterialPublished && (session.rawContentUrl || session.filePath)) {
        const url = session.filePath || session.rawContentUrl || '';
        const isSlides = url.toLowerCase().match(/\.(pptx|ppt)$/);
        publishedItems.push({
          _id: `primary-${session._id}`,
          sessionId: session._id,
          title: `${session.title} (Source)`,
          url,
          type: isSlides ? 'SLIDES' : 'PDF',
          category: 'SOURCE',
          publishedAt: session.updatedAt || new Date(),
          instructorName
        });
      }

      // 2. Extra Materials
      if (session.materials) {
        for (const mat of session.materials) {
          if (mat.isPublished) {
            const url = mat.filePath || '';
            const isSlides = url.toLowerCase().match(/\.(pptx|ppt)$/);
            publishedItems.push({
              _id: mat._id,
              sessionId: session._id,
              materialId: mat._id,
              title: mat.title,
              url,
              type: isSlides ? 'SLIDES' : 'PDF',
              category: 'RESOURCE',
              publishedAt: mat.updatedAt || new Date(),
              instructorName
            });
          }
        }
      }

      // 3. AI Generated Content
      if (session.isContentPublished) {
        publishedItems.push({
          _id: `ai-${session._id}`,
          sessionId: session._id,
          title: `${session.title} (AI Insights)`,
          type: 'AI',
          category: 'INTELLIGENCE',
          publishedAt: new Date(),
          instructorName
        });
      }
    }

    return publishedItems;
  }
}
