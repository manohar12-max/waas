import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from './user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: any): Types.ObjectId | null {
    if (!id) return null;
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && id.length === 24) {
      try {
        return new Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async create(createUserDto: any): Promise<UserDocument> {
    const { password, collegeId, ...rest } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData: any = {
      ...rest,
      password: hashedPassword,
    };

    if (collegeId) {
      const cId = this.toObjectId(collegeId);
      if (cId) userData.collegeId = cId;
    }

    const newUser = new this.userModel(userData);
    return newUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    if (!email) return null;
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    const oId = this.toObjectId(id);
    if (!oId) return null;
    return this.userModel.findById(oId).exec();
  }

  async findByCollege(collegeId: string, role?: UserRole): Promise<UserDocument[]> {
    const cId = this.toObjectId(collegeId);
    if (!cId) return [];

    const query: any = { collegeId: cId };
    if (role) query.role = role;
    return this.userModel.find(query).select('-password').exec();
  }

  async remove(id: string, collegeId: string): Promise<any> {
    const uId = this.toObjectId(id);
    const cId = this.toObjectId(collegeId);
    if (!uId || !cId) return null;

    return this.userModel.findOneAndDelete({
      _id: uId,
      collegeId: cId,
    }).exec();
  }
}
