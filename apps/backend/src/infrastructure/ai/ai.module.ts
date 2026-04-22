import { Module, Global } from '@nestjs/common';
import { GroqService } from './groq.service';

@Global()
@Module({
  providers: [GroqService],
  exports: [GroqService],
})
export class AIModule {}
