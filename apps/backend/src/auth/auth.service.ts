import {
  Injectable, UnauthorizedException, ConflictException,
  Logger, ForbiddenException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { CollegesService } from '../colleges/colleges.service';
import { GlobalRulesService } from '../global-rules/global-rules.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private workshopsService: WorkshopsService,
    private collegesService: CollegesService,
    private jwtService: JwtService,
    private globalRules: GlobalRulesService,
  ) {}

  async signUp(createUserDto: any, inviteToken?: string) {
    const email = createUserDto.email.trim().toLowerCase();
    this.logger.log(`Sign-up attempt for: ${email}`);
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
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

    const user = await this.usersService.create({ ...createUserDto, email, password });

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
    const rules = await this.globalRules.get();

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) {
      this.logger.warn(`Sign-in failed: User not found or no password - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // ── Account lockout check ──────────────────────────────────────
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${minsLeft} minute(s).`
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      // Increment failed attempts
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = rules.max_login_attempts || 5;
      const update: any = { failedLoginAttempts: newAttempts };

      if (newAttempts >= maxAttempts) {
        update.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 min
        this.logger.warn(`Account locked for ${email} after ${newAttempts} failed attempts`);
      }
      await this.usersService.updateById((user as any)._id.toString(), update);
      this.logger.warn(`Sign-in failed: Password mismatch - ${email} (attempt ${newAttempts}/${maxAttempts})`);
      throw new UnauthorizedException(`Invalid credentials. ${maxAttempts - newAttempts > 0 ? `${maxAttempts - newAttempts} attempt(s) remaining.` : 'Account locked for 15 minutes.'}`);
    }

    // ── Success: reset failed attempts ──────────────────────────────
    if ((user.failedLoginAttempts || 0) > 0) {
      await this.usersService.updateById((user as any)._id.toString(), {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
    }

    // ── Block expired colleges ──────────────────────────────────────
    if (user.role !== 'SUPER_ADMIN' && user.collegeId && rules.block_expired_colleges) {
      try {
        const college = await this.collegesService.findOne(user.collegeId.toString());
        if (college && college.status === 'EXPIRED') {
          this.logger.warn(`Access blocked: College ${college.name} subscription has expired for ${email}`);
          throw new ForbiddenException(
            "Your institution's subscription has expired. Please contact Pixaflip support to restore access."
          );
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        this.logger.error(`Failed to check college status for ${email}: ${e.message}`);
      }
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
        phone: user.phone,
        phoneNumber: user.phoneNumber,
        role: user.role,
        collegeId: user.collegeId,
      },
    };
  }
}
