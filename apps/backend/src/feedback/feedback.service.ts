import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from './feedback.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) {}

  async create(data: any): Promise<Feedback> {
    try {
      const { workshopId, sessionId, ...rest } = data;
      const feedbackData = {
        ...rest,
        workshopId: new Types.ObjectId(workshopId),
        sessionId: sessionId ? new Types.ObjectId(sessionId) : undefined,
      };
      const feedback = new this.feedbackModel(feedbackData);
      return await feedback.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('You have already submitted feedback for this session/workshop.');
      }
      throw error;
    }
  }

  async getSessionFeedback(sessionId: string): Promise<Feedback[]> {
    return this.feedbackModel.find({ 
      $or: [
        { sessionId: new Types.ObjectId(sessionId) },
        { sessionId: sessionId }
      ]
    })
      .populate('submittedBy.userId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getWorkshopFeedback(workshopId: string): Promise<Feedback[]> {
    return this.feedbackModel.find({ 
      $or: [
        { workshopId: new Types.ObjectId(workshopId) },
        { workshopId: workshopId }
      ]
    })
      .populate('submittedBy.userId', 'name email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAnalytics(workshopId: string) {
    const workshopObjectId = new Types.ObjectId(workshopId);

    const stats = await this.feedbackModel.aggregate([
      { 
        $match: { 
          $or: [
            { workshopId: workshopObjectId },
            { workshopId: workshopId }
          ]
        } 
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          avgContentQuality: { $avg: '$ratings.contentQuality' },
          avgClarity: { $avg: '$ratings.clarity' },
          avgEngagement: { $avg: '$ratings.engagement' },
          avgUsefulness: { $avg: '$ratings.usefulness' },
          avgOverall: { $avg: '$ratings.overall' },
        },
      },
    ]);

    const sessionStats = await this.feedbackModel.aggregate([
      { 
        $match: { 
          $or: [
            { workshopId: workshopObjectId },
            { workshopId: workshopId }
          ],
          type: 'SESSION' 
        } 
      },
      {
        $group: {
          _id: '$sessionId',
          avgOverall: { $avg: '$ratings.overall' },
          count: { $sum: 1 },
        },
      },
      {
          $lookup: {
              from: 'sessions',
              localField: '_id',
              foreignField: '_id',
              as: 'sessionInfo'
          }
      },
      { $unwind: { path: '$sessionInfo', preserveNullAndEmptyArrays: true } }
    ]);

    const ratingDistribution = await this.feedbackModel.aggregate([
        { 
          $match: { 
            $or: [
              { workshopId: workshopObjectId },
              { workshopId: workshopId }
            ]
          } 
        },
        {
            $group: {
                _id: '$ratings.overall',
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return {
      summary: stats[0] || {
        totalResponses: 0,
        avgContentQuality: 0,
        avgClarity: 0,
        avgEngagement: 0,
        avgUsefulness: 0,
        avgOverall: 0,
      },
      sessionStats,
      ratingDistribution
    };
  }

  async getAllFeedbackForAdmin(filters: any) {
      const query: any = {};
      if (filters.workshopId) query.workshopId = new Types.ObjectId(filters.workshopId);
      if (filters.type) query.type = filters.type;
      
      return this.feedbackModel.find(query)
        .populate('submittedBy.userId', 'name email')
        .populate('workshopId', 'title')
        .sort({ createdAt: -1 })
        .exec();
  }

  async findUserFeedback(userId: string) {
    return this.feedbackModel.find({ 'submittedBy.userId': new Types.ObjectId(userId) })
      .select('sessionId workshopId type')
      .exec();
  }
}
