import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NaacReportsController } from './naac-reports.controller';
import { NaacReportsService } from './naac-reports.service';
import { NaacReport, NaacReportSchema } from './naac-report.schema';
import { WorkshopsModule } from '../workshops/workshops.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NaacReport.name, schema: NaacReportSchema }]),
    WorkshopsModule,
  ],
  controllers: [NaacReportsController],
  providers: [NaacReportsService],
  exports: [NaacReportsService],
})
export class NaacReportsModule {}

