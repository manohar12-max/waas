import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Announcement, AnnouncementDocument } from './announcement.schema';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(Announcement.name) private announcementModel: Model<AnnouncementDocument>,
  ) {}

  async create(data: any, user: any) {
    const announcement = new this.announcementModel({
      ...data,
      authorId: user._id || user.id,
      authorRole: user.role,
    });
    return announcement.save();
  }

  async findAll(workshopId?: string, divisionId?: string) {
    const filters: any[] = [
      { authorRole: 'SUPER_ADMIN', workshopId: { $exists: false } },
      { authorRole: 'SUPER_ADMIN', workshopId: null }
    ];
    
    if (workshopId && Types.ObjectId.isValid(workshopId)) {
      const workshopSpecific: any = { workshopId: new Types.ObjectId(workshopId) };
      if (divisionId && Types.ObjectId.isValid(divisionId)) {
        workshopSpecific.$or = [
          { divisionId: new Types.ObjectId(divisionId) },
          { divisionId: { $exists: false } },
          { divisionId: null }
        ];
      }
      filters.push(workshopSpecific);
    }

    return this.announcementModel
      .find({ $or: filters })
      .populate('authorId', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .exec();
  }

  async update(id: string, data: any, user: any) {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) throw new NotFoundException('Announcement not found');
    
    const userId = user._id?.toString() || user.id?.toString();
    // Only creator, Super Admin or Instructor (for their context) can edit
    const isOwner = announcement.authorId.toString() === userId;
    const isAuthorized = isOwner || user.role === 'SUPER_ADMIN' || user.role === 'INSTRUCTOR';
    
    if (!isAuthorized) {
      throw new ForbiddenException('Unauthorized to update this announcement');
    }

    Object.assign(announcement, data);
    return announcement.save();
  }

  async remove(id: string, user: any) {
    const announcement = await this.announcementModel.findById(id);
    if (!announcement) throw new NotFoundException('Announcement not found');

    const userId = user._id?.toString() || user.id?.toString();
    const isOwner = announcement.authorId.toString() === userId;
    const isAuthorized = isOwner || user.role === 'SUPER_ADMIN' || user.role === 'INSTRUCTOR';

    if (!isAuthorized) {
      throw new ForbiddenException('Unauthorized to delete this announcement');
    }

    return this.announcementModel.findByIdAndDelete(id);
  }
}
