import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Day, DaySchema } from './schemas/day.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { SessionContent, SessionContentSchema } from './schemas/session-content.schema';
import { Workshop, WorkshopSchema } from '../workshop.schema';
import { SessionContentService } from './session-content.service';
import { SessionContentController } from './session-content.controller';
import { SessionContentProcessor } from './session-content.processor';
import { PDFService } from '../../infrastructure/pdf/pdf.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Day.name, schema: DaySchema },
      { name: Session.name, schema: SessionSchema },
      { name: SessionContent.name, schema: SessionContentSchema },
      { name: Workshop.name, schema: WorkshopSchema },
    ]),
    HttpModule,
  ],
  providers: [SessionContentService, SessionContentProcessor, PDFService],
  controllers: [SessionContentController],
  exports: [SessionContentService],
})
export class SessionContentModule { }
