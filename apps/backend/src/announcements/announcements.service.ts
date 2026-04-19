import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from './announcement.schema';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
  ) {}

  async create(data: any, authorId: string, authorName: string, role: string, collegeId?: string) {
    this.logger.log(`Creating announcement by ${role}: ${authorId}`);
    const ann = new this.announcementModel({
      ...data,
      authorId: new Types.ObjectId(authorId),
      authorName,
      // Super admin creates global (null), instructors scope to their college
      collegeId: role === 'SUPER_ADMIN' ? null : (collegeId ? new Types.ObjectId(collegeId) : null),
    });
    return ann.save();
  }

  async findAll(userRole: string, userCollegeId?: string) {
    const now = new Date();
    const baseQuery: any = {
      active: true,
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }, { expiresAt: { $exists: false } }],
    };

    // Students, teachers, college admins, instructors see global + their college's
    if (userRole !== 'SUPER_ADMIN') {
      const conditions: any[] = [{ collegeId: null }]; // always see global
      if (userCollegeId) {
        conditions.push({ collegeId: new Types.ObjectId(userCollegeId) });
      }
      baseQuery.$and = [{ $or: conditions }];
    }

    return this.announcementModel.find(baseQuery).sort({ createdAt: -1 }).limit(20).exec();
  }

  async update(id: string, data: any, userId: string, role: string, collegeId?: string) {
    const ann = await this.announcementModel.findById(id);
    if (!ann) throw new NotFoundException('Announcement not found');

    // Super admin can edit any; Instructor only their college's
    if (role !== 'SUPER_ADMIN') {
      if (!ann.collegeId || ann.collegeId.toString() !== collegeId) {
        throw new ForbiddenException('You can only edit your college announcements');
      }
    }

    Object.assign(ann, data);
    return ann.save();
  }

  async remove(id: string, userId: string, role: string, collegeId?: string) {
    const ann = await this.announcementModel.findById(id);
    if (!ann) throw new NotFoundException('Announcement not found');

    if (role !== 'SUPER_ADMIN') {
      if (!ann.collegeId || ann.collegeId.toString() !== collegeId) {
        throw new ForbiddenException('You can only delete your college announcements');
      }
    }

    await this.announcementModel.findByIdAndDelete(id);
    return { message: 'Announcement deleted' };
  }
}
