import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request, UseGuards, UseInterceptors,
  UploadedFile, UploadedFiles, ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { NaacReportsService } from './naac-reports.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.schema';

const uploadStorage = (prefix: string) => diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${prefix}-${Date.now()}${ext}`);
  },
});

/** Helper — ensure COLLEGE_ADMIN can only touch their own college's reports */
async function assertOwnership(svc: NaacReportsService, reportId: string, req: any) {
  if (req.user.role === UserRole.SUPER_ADMIN) return; // SA can access all
  const report = await svc.findOne(reportId);
  const reportCollegeId = (report as any).collegeId?._id?.toString() ?? (report as any).collegeId?.toString();
  const userCollegeId = req.user.collegeId?.toString();
  if (reportCollegeId !== userCollegeId) {
    throw new ForbiddenException('You can only manage NAAC reports for your own institution.');
  }
}

@Controller('naac-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN)
export class NaacReportsController {
  constructor(
    private readonly svc: NaacReportsService,
    private readonly workshopsService: WorkshopsService,
  ) {}

  // ── Static routes FIRST (before :id) ─────────────────────────

  /** SA: all reports. College Admin: only their college's reports */
  @Get()
  async findAll(@Request() req: any) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.svc.findAll();
    }
    const collegeId = req.user.collegeId?.toString();
    if (!collegeId) return [];
    return this.svc.findAllByCollege(collegeId);
  }

  /** Get workshops for a college (SA passes any collegeId; CA can only query own) */
  @Get('workshops-by-college/:collegeId')
  async getWorkshopsByCollege(@Param('collegeId') collegeId: string, @Request() req: any) {
    if (req.user.role === UserRole.COLLEGE_ADMIN) {
      const userCollegeId = req.user.collegeId?.toString();
      if (collegeId !== userCollegeId) {
        throw new ForbiddenException('You can only view workshops for your own institution.');
      }
    }
    return this.workshopsService.findAllByCollegeId(collegeId);
  }

  /** College Admin: their own approved reports (legacy read-only endpoint, kept for compatibility) */
  @Get('my-college/reports')
  async getMyCollegeReports(@Request() req: any) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.svc.findAllApproved();
    }
    const collegeId = req.user.collegeId;
    if (!collegeId) return [];
    return this.svc.findByCollege(collegeId.toString());
  }

  // ── Dynamic :id routes AFTER static routes ────────────────────

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.findOne(id);
  }

  @Get(':id/backend-stats/:workshopId')
  async getBackendStats(@Param('id') id: string, @Param('workshopId') workshopId: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req); // workshopId check could be deeper but this is fine for now
    return this.svc.getBackendStats(workshopId);
  }

  @Post()
  create(@Request() req: any, @Body() body: any) {
    // College Admin can only create for their own college
    if (req.user.role === UserRole.COLLEGE_ADMIN) {
      body.collegeId = req.user.collegeId?.toString();
    }
    return this.svc.create(body, req.user.id || req.user.sub);
  }

  @Patch(':id/raw-data')
  async updateRawData(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.updateRawData(id, body);
  }

  // ── File uploads ──────────────────────────────────────────────

  @Post(':id/upload/notice')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage('naac-notice') }))
  async uploadNotice(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.updateRawData(id, { officialNoticeUrl: `/uploads/${file.filename}` });
  }

  @Post(':id/upload/attendance')
  @UseInterceptors(FileInterceptor('file', { storage: uploadStorage('naac-attendance') }))
  async uploadAttendance(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.updateRawData(id, { attendanceSheetUrl: `/uploads/${file.filename}` });
  }

  @Post(':id/upload/photos')
  @UseInterceptors(FilesInterceptor('photos', 4, { storage: uploadStorage('naac-photo') }))
  async uploadPhotos(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[], @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    const report = await this.svc.findOne(id);
    const existing: string[] = (report as any).photoUrls || [];
    const newUrls = files.map(f => `/uploads/${f.filename}`);
    return this.svc.updateRawData(id, { photoUrls: [...existing, ...newUrls] });
  }

  // ── Workflow ──────────────────────────────────────────────────

  @Post(':id/analyze-notice')
  async analyzeNotice(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.analyzeNotice(id);
  }

  @Post(':id/analyze-images')
  async analyzeImages(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.analyzeImages(id);
  }

  @Post(':id/analyze-materials')
  async analyzeMaterials(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.analyzeMaterials(id);
  }

  @Post(':id/generate')
  async generateReport(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.generateReport(id);
  }

  @Post(':id/stop')
  async stopGeneration(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.stopGeneration(id);
  }

  @Post('pause-queue')
  @Roles(UserRole.SUPER_ADMIN)
  async pauseQueue() {
    return this.svc.pauseQueue();
  }

  @Post('resume-queue')
  @Roles(UserRole.SUPER_ADMIN)
  async resumeQueue() {
    return this.svc.resumeQueue();
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.approveReport(id);
  }

  @Post(':id/decline')
  async decline(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.declineReport(id, body.reason ?? '');
  }

  @Post(':id/cancel-review')
  async cancelReview(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.cancelReview(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    await assertOwnership(this.svc, id, req);
    return this.svc.remove(id);
  }
}
