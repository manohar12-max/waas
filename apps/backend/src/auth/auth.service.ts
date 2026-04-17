import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { WorkshopsService } from '../workshops/workshops.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private workshopsService: WorkshopsService,
    private jwtService: JwtService,
  ) {}

  async signUp(createUserDto: any, inviteToken?: string) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const user = await this.usersService.create({
      ...createUserDto,
      password: createUserDto.password || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    });
    
    // Auto-enroll if invite token is present
    if (inviteToken && user.role === 'STUDENT') {
      await this.workshopsService.registerStudent(inviteToken, user._id);
    }

    return this.generateToken(user);
  }

  async signIn(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
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
