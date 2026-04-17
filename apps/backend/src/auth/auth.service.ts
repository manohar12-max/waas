import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { WorkshopsService } from '../workshops/workshops.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private workshopsService: WorkshopsService,
    private jwtService: JwtService,
  ) {}

  async signUp(createUserDto: any, inviteToken?: string) {
    const email = createUserDto.email.trim().toLowerCase();
    this.logger.log(`Sign-up attempt for: ${email}`);
    
    const existingUser = await this.usersService.findByEmail(email);
    
    if (existingUser) {
      // If it's a student with an invite token, allow them to proceed (it will auto-enroll below)
      if (inviteToken && existingUser.role === 'STUDENT') {
        this.logger.log(`Existing student ${email} signing up with invite token. Proceeding to auto-enroll.`);
        return this.generateToken(existingUser);
      }
      
      this.logger.warn(`Sign-up failed: User already exists - ${email}`);
      throw new ConflictException('User already exists');
    }

    const password = createUserDto.password || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    if (!createUserDto.password) {
      this.logger.log(`Generating random password for user ${createUserDto.email}`);
    }

    const user = await this.usersService.create({
      ...createUserDto,
      email, // Use normalized email
      password,
    });
    
    // Auto-enroll if invite token is present
    if (inviteToken && user.role === 'STUDENT') {
      try {
        await this.workshopsService.registerStudent(inviteToken, user._id);
        this.logger.log(`Successfully enrolled student ${user.email} using token.`);
      } catch (error) {
        this.logger.error(`Failed to auto-enroll student ${user.email} after sign-up: ${error.message}`);
      }
    }

    return this.generateToken(user);
  }

  async signIn(email: string, pass: string) {
    this.logger.log(`Sign-in attempt for: ${email}`);
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      this.logger.warn(`Sign-in failed: User not found or no password - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      this.logger.warn(`Sign-in failed: Password mismatch - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.logger.log(`Successfully signed in: ${email}`);
    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
      },
    };
  }
}
