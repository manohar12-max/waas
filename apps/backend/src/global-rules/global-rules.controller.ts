import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { GlobalRulesService } from './global-rules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

@Controller('global-rules')
export class GlobalRulesController {
  constructor(private readonly svc: GlobalRulesService) {}

  /** Public — frontend reads rules on boot (no auth needed for basic platform flags) */
  @Get()
  async getAll() {
    return this.svc.get();
  }

  /** Super Admin — save updated rules */
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Body() body: any) {
    return this.svc.update(body);
  }
}
