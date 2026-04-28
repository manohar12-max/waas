import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AiService } from './ai-service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('start-generation')
  async startGeneration(@Body() body: { syllabus: string; audience: string; topic: string; slides_text?: string }) {
    return this.aiService.startGeneration(body);
  }

  @Post('review')
  async submitReview(
    @Body() body: { session_id: string; stage: 1 | 2; action: 'continue' | 'edit'; edited_data?: any },
  ) {
    return this.aiService.submitReview(body.session_id, body.stage, body.action, body.edited_data);
  }

  @Get('final-output/:sessionId')
  async getFinalOutput(@Param('sessionId') sessionId: string) {
    return this.aiService.getFinalOutput(sessionId);
  }

  @Get('health')
  async checkHealth() {
    return { status: (await this.aiService.checkHealth()) ? 'ok' : 'error' };
  }
}
