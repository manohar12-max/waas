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
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.STUDENT)
  async getWorkshopStructure(@Param('workshopId') workshopId: string) {
    return this.service.getFullWorkshopStructure(workshopId);
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
    const materials = files.map((file, index) => ({
      title: file.originalname,
      url: `/uploads/${file.filename}`,
      filePath: file.path,
      type: file.mimetype.includes('pdf') ? 'PDF' : file.mimetype.includes('presentation') ? 'SLIDES' : 'OTHER',
      isSourceForAI: isSource // Using flag from body
    }));

    return this.service.createSession(
      body.workshopId, 
      body.dayId, 
      body.title, 
      materials
    );
  }

  @Post(':id/generate')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async triggerGeneration(@Param('id') sessionId: string) {
    return this.service.triggerGeneration(sessionId);
  }

  @Post(':id/review-stage-1')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async reviewStage1(
    @Param('id') sessionId: string,
    @Body() body: { action: 'continue' | 'edit'; edited_data?: any }
  ) {
    return this.service.reviewStage1(sessionId, body.action, body.edited_data);
  }

  @Post(':id/review-stage-2')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async reviewStage2(
    @Param('id') sessionId: string,
    @Body() body: { action: 'continue' | 'edit'; edited_data?: any }
  ) {
    return this.service.reviewStage2(sessionId, body.action, body.edited_data);
  }

  @Patch(':id/approve')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN)
  async approveContent(@Param('id') sessionId: string) {
    return this.service.approveContent(sessionId);
  }

  @Get(':id/content')
  @Roles(UserRole.INSTRUCTOR, UserRole.COLLEGE_ADMIN, UserRole.STUDENT)
  async getSessionContent(
    @Param('id') sessionId: string,
    @GetUser('role') role: string
  ) {
    return this.service.getSessionContent(sessionId, role);
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
}

