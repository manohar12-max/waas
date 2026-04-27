import { Module, Global } from '@nestjs/common';
import { GroqService } from './groq.service';
import { AiService } from './ai-service';
import { AiController } from './ai.controller';

@Global()
@Module({
  controllers: [AiController],
  providers: [GroqService, AiService],
  exports: [GroqService, AiService],
})
export class AIModule {}
