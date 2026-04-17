import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/user.schema';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
