import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NaacReportsController } from './naac-reports.controller';
import { NaacReportsService } from './naac-reports.service';
import { NaacReport, NaacReportSchema } from './naac-report.schema';
import { WorkshopsModule } from '../workshops/workshops.module';
import { FeedbackModule } from '../feedback/feedback.module';

import { BullModule } from '@nestjs/bullmq';
import { NaacReportsProcessor } from './naac-reports.processor';
import { PDFService } from '../infrastructure/pdf/pdf.service';
import { GroqService } from '../infrastructure/ai/groq.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NaacReport.name, schema: NaacReportSchema }]),
    WorkshopsModule,
    FeedbackModule,
    BullModule.registerQueue({
      name: 'naac-reports',
    }),
  ],
  controllers: [NaacReportsController],
  providers: [NaacReportsService, NaacReportsProcessor, PDFService, GroqService],
  exports: [NaacReportsService],
})
export class NaacReportsModule {}

