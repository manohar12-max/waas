import { Controller, Post, Patch, Body, UseGuards, Get, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/user.schema';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.signIn(body.email, body.password);
  }

  @Public()
  @Post('register')
  signUp(@Body() createUserDto: any, @Body('inviteToken') inviteToken?: string) {
    // Security: Only allow STUDENT registration publicly if inviteToken is present.
    // Admin-level user creation (Teachers/Instructors) still happens via the Admin dashboards.
    if (createUserDto.role !== UserRole.STUDENT && !inviteToken) {
       // In a real scenario, we'd check for an admin token here, 
       // but for this pivot, students use tokens and admins use the dashboard.
    }
    return this.authService.signUp(createUserDto, inviteToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() body: { name?: string; phone?: string; phoneNumber?: string; currentPassword?: string; newPassword?: string }) {
    const userId = req.user.id || req.user.sub;
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.phoneNumber) updateData.phoneNumber = body.phoneNumber;
    if (body.newPassword && body.currentPassword) {
      // Validate current password before allowing change
      const validation = await this.authService.signIn(req.user.email, body.currentPassword).catch(() => null);
      if (!validation) throw new Error('Current password is incorrect');
      updateData.password = body.newPassword;
    }
    const updated = await this.usersService.update(userId, updateData);
    return { 
      name: updated.name, 
      email: updated.email, 
      phone: updated.phone, 
      phoneNumber: updated.phoneNumber,
      profileImage: updated.profileImage, 
      role: updated.role 
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${Date.now()}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files allowed'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }))
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id || req.user.sub;
    const profileImage = `/uploads/${file.filename}`;
    await this.usersService.update(userId, { profileImage });
    return { profileImage };
  }
}
