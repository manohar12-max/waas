import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sandbox')
@UseGuards(JwtAuthGuard)
export class SandboxController {
  constructor(private readonly sandboxService: SandboxService) {}

  @Post('run-code')
  async runCode(
    @Body() body: { language: string; sourceCode: string },
  ) {
    return this.sandboxService.runCode(body.language, body.sourceCode);
  }

  @Post('projects')
  async createProject(
    @Req() req: any,
    @Body() body: { name: string; language: string },
  ) {
    return this.sandboxService.createProject(body.name, body.language, req.user._id);
  }

  @Get('projects')
  async listProjects(@Req() req: any) {
    return this.sandboxService.listProjects(req.user._id);
  }

  @Get('projects/:id')
  async getProject(@Param('id') id: string) {
    return this.sandboxService.getProject(id);
  }

  @Patch('projects/:id')
  async updateProject(
    @Param('id') id: string,
    @Body() body: { code: string },
  ) {
    return this.sandboxService.updateProject(id, body.code);
  }
}
