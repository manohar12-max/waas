import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    return null;
  }

  async create(createUserDto: any): Promise<UserDocument> {
    const { password, collegeId, email, name, role } = createUserDto;
    this.logger.log(`Creating user: ${email} (${role})`);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData: any = {
      ...createUserDto,
      password: hashedPassword,
    };

    if (collegeId) {
      const cId = this.toObjectId(collegeId);
      if (cId) {
        userData.collegeId = cId;
      } else {
        this.logger.warn(`Invalid collegeId provided for user ${email}: ${collegeId}`);
      }
    }

    const newUser = new this.userModel(userData);
    try {
      const savedUser = await newUser.save();
      this.logger.log(`User created successfully: ${email} [ID: ${savedUser._id}]`);
      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to create user ${email}: ${error.message}`);
      throw error;
    }
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
    if (!uId || !cId) {
      this.logger.warn(`Invalid ID or CollegeID for removal: user[${id}], college[${collegeId}]`);
      return null;
    }

    this.logger.log(`Removing user: ${uId} from college: ${cId}`);
    const result = await this.userModel.findOneAndDelete({
      _id: uId,
      collegeId: cId,
    }).exec();

    if (result) {
      this.logger.log(`User ${id} removed successfully.`);
    } else {
      this.logger.warn(`User ${id} not found for removal in college ${collegeId}.`);
    }
    return result;
  }
}
