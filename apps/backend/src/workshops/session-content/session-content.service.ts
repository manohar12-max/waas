import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (!session.rawContentUrl) throw new BadRequestException('Raw content URL is required for generation');

    session.status = 'processing';
    await session.save();

    const job = await this.generationQueue.add('generate', {
      sessionId,
      rawContentUrl: session.rawContentUrl,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    session.jobId = job.id;
    await session.save();

    return { jobId: job.id, status: 'processing' };
  }

  async approveContent(sessionId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'generated') {
      throw new BadRequestException('Content must be generated before approval');
    }

    session.status = 'approved';
    await session.save();
    return session;
  }

  async getSessionContent(sessionId: string) {
    return this.contentModel.findOne({ sessionId: new Types.ObjectId(sessionId) });
  }

  async updateSessionStatus(sessionId: string, status: string, jobId?: string) {
    const update: any = { status };
    if (jobId) update.jobId = jobId;
    await this.sessionModel.findByIdAndUpdate(sessionId, update);
  }

  async saveGeneratedContent(sessionId: string, mcqs: any[], materials: any[]) {
    await this.contentModel.findOneAndUpdate(
      { sessionId: new Types.ObjectId(sessionId) },
      { mcqs, materials },
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

  async updateSession(sessionId: string, data: { title?: string, rawContentUrl?: string, filePath?: string }) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    if (data.title) session.title = data.title;
    
    // If material changes, reset status to pending
    if (data.rawContentUrl || data.filePath) {
      session.rawContentUrl = data.rawContentUrl;
      session.filePath = data.filePath;
      session.status = 'pending';
    }

    await session.save();
    return session;
  }
}
