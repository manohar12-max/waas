import { Controller, Post, Get, Patch, Body, Param, UseInterceptors, UploadedFiles, Delete, UseGuards, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SessionContentService } from './session-content.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.schema';
import { GetUser } from '../../auth/get-user.decorator';

@Controller('sessions-content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionContentController {
  constructor(private readonly service: SessionContentService) {}

  @Post('days')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async createDay(@Body() body: { workshopId: string; date: string; dayNumber: number }) {
    return this.service.createDay(body.workshopId, new Date(body.date), body.dayNumber);
  }

  @Post('days/:id/delete')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async deleteDay(@Param('id') dayId: string) {
    return this.service.deleteDay(dayId);
  }

  @Get('workshop/:workshopId')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.STUDENT, UserRole.TEACHER)
  async getWorkshopStructure(
    @Param('workshopId') workshopId: string,
    @GetUser('_id') userId: string,
    @GetUser('role') role: string
  ) {
    return this.service.getFullWorkshopStructure(workshopId, userId, role);
  }

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async createSession(
    @Body() body: { workshopId: string; dayId: string; title: string, isSourceForAI?: string | boolean },
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const isSource = body.isSourceForAI === 'true' || body.isSourceForAI === true;
    const materials = files.map((file) => ({
      title: file.originalname,
      url: `/uploads/${file.filename}`,
      filePath: file.path,
      type: file.mimetype.includes('pdf') ? 'PDF' : file.mimetype.includes('presentation') ? 'SLIDES' : 'OTHER',
      isSourceForAI: isSource
    }));

    return this.service.createSession(
      body.workshopId, 
      body.dayId, 
      body.title, 
      materials
    );
  }

  @Post(':id/review-stage-1')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async reviewStage1(
    @Param('id') sessionId: string,
    @Body() body: { action: 'continue' | 'edit'; edited_data?: any; materialId?: string }
  ) {
    return this.service.reviewStage1(sessionId, body.action, body.edited_data, body.materialId);
  }

  @Post(':id/review-stage-2')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async reviewStage2(
    @Param('id') sessionId: string,
    @Body() body: { action: 'continue' | 'edit'; edited_data?: any; materialId?: string }
  ) {
    return this.service.reviewStage2(sessionId, body.action, body.edited_data, body.materialId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async approveContent(
    @Param('id') sessionId: string,
    @Body() body: { materialId?: string }
  ) {
    return this.service.approveContent(sessionId, body.materialId);
  }

  @Patch(':id/toggle-publish-content')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async togglePublishContent(
    @Param('id') sessionId: string,
    @Body() body: { materialId: string }
  ) {
    return this.service.toggleContentPublish(sessionId, body.materialId);
  }

  @Get(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.STUDENT, UserRole.TEACHER)
  async getSessionContent(
    @Param('id') sessionId: string,
    @GetUser('role') role: string,
    @GetUser('_id') userId: string,
    @Req() req: any
  ) {
    const materialId = req.query.materialId as string;
    const publishedOnly = req.query.publishedOnly === 'true';
    return this.service.getSessionContent(sessionId, role, userId, materialId, publishedOnly);
  }

  @Post('session/:id/delete')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async deleteSession(@Param('id') sessionId: string) {
    return this.service.deleteSession(sessionId);
  }

  @Patch('session/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async updateSession(
    @Param('id') id: string,
    @Body() body: { title?: string, isSourceForAI?: string | boolean },
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const isSource = body.isSourceForAI === 'true' || body.isSourceForAI === true;
    const materials = files.map(file => ({
      title: file.originalname,
      url: `/uploads/${file.filename}`,
      filePath: file.path,
      type: file.mimetype.includes('pdf') ? 'PDF' : file.mimetype.includes('presentation') ? 'SLIDES' : 'OTHER',
      isSourceForAI: isSource
    }));

    return this.service.updateSession(id, {
      title: body.title,
      materials: materials.length > 0 ? materials : undefined,
    });
  }

  @Delete(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async deleteSessionContent(
    @Param('id') sessionId: string,
    @Body() body: { materialId?: string }
  ) {
    console.log('[CONTROLLER] Deleting content for:', sessionId, 'Material:', body.materialId);
    return this.service.deleteSessionContent(sessionId, body.materialId);
  }

  @Post(':id/materials')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async addMaterials(
    @Param('id') id: string,
    @Body() body: { isSourceForAI?: string | boolean },
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const isSource = body.isSourceForAI === 'true' || body.isSourceForAI === true;
    const materials = files.map(file => ({
      title: file.originalname,
      url: `/uploads/${file.filename}`,
      filePath: file.path,
      type: file.mimetype.includes('pdf') ? 'PDF' : file.mimetype.includes('presentation') ? 'SLIDES' : 'OTHER',
      isSourceForAI: isSource
    }));

    return this.service.addMaterials(id, materials);
  }

  @Delete(':id/materials')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async removeMaterial(
    @Param('id') id: string,
    @Body() body: { url: string }
  ) {
    return this.service.removeMaterial(id, body.url);
  }

  @Patch(':id/materials/toggle-publish')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async togglePublish(
    @Param('id') id: string,
    @Body() body: { url: string }
  ) {
    return this.service.toggleMaterialPublish(id, body.url);
  }

  @Get(':id/extract-preview')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async extractPreview(
    @Param('id') sessionId: string,
    @Req() req: any
  ) {
    const materialUrl = req.query.materialUrl as string;
    return this.service.extractPreview(sessionId, materialUrl);
  }

  @Post(':id/generate')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async generate(
    @Param('id') id: string, 
    @Body() body: { topic?: string, audience?: string, materialId?: string, materialUrl?: string, syllabus?: string }
  ) {
    console.log('[CONTROLLER DEBUG] Calling Service with:', { id, ...body });
    return this.service.triggerGeneration(id, body.topic, body.audience, body.materialId, body.materialUrl, body.syllabus);
  }

  @Post(':id/mcq-submit')
  @Roles(UserRole.STUDENT)
  async submitMcqAttempt(
    @Param('id') sessionId: string,
    @GetUser('_id') userId: string,
    @Body() body: { materialId: string, score: number, totalQuestions: number }
  ) {
    return this.service.submitMcqAttempt(userId, sessionId, body.materialId, body.score, body.totalQuestions);
  }

  @Get(':id/mcq-status')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.TEACHER, UserRole.COLLEGE_ADMIN)
  async getMcqStatus(
    @Param('id') sessionId: string,
    @GetUser('_id') userId: string,
    @Req() req: any
  ) {
    const materialId = req.query.materialId as string;
    const studentId = req.query.studentId || userId; // Allow staff to check student status
    return this.service.getMcqStatus(studentId, sessionId, materialId);
  }
}
