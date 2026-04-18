import { Controller, Post, Get, Patch, Body, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionContentService } from './session-content.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('sessions-content')
export class SessionContentController {
  constructor(private readonly service: SessionContentService) { }

  @Post('days')
  async createDay(@Body() body: { workshopId: string; date: string; dayNumber: number }) {
    return this.service.createDay(body.workshopId, new Date(body.date), body.dayNumber);
  }

  @Get('workshop/:workshopId')
  async getWorkshopStructure(@Param('workshopId') workshopId: string) {
    return this.service.getFullWorkshopStructure(workshopId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async createSession(
    @Body() body: { workshopId: string; dayId: string; title: string; rawContentUrl?: string },
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.service.createSession(
      body.workshopId,
      body.dayId,
      body.title,
      body.rawContentUrl,
      file?.path
    );
  }

  @Post('session/:id/add-material')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async addMaterial(
    @Param('id') sessionId: string,
    @Body('title') title: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.service.addMaterial(sessionId, title, file.path);
  }

  @Post(':id/generate')
  async triggerGeneration(
    @Param('id') sessionId: string,
    @Body() body: { materialId?: string }
  ) {
    return this.service.triggerGeneration(sessionId, body.materialId);
  }

  @Post(':id/review')
  async reviewAIContent(
    @Param('id') sessionId: string,
    @Body() body: { stage: 1 | 2; action: 'continue' | 'edit'; editedData?: any }
  ) {
    return this.service.reviewAIContent(sessionId, body.stage, body.action, body.editedData);
  }

  @Get(':id/final-output')
  async getAIFinalOutput(@Param('id') sessionId: string) {
    return this.service.fetchAIFinalOutput(sessionId);
  }

  @Patch(':id/approve')
  async approveContent(
    @Param('id') sessionId: string,
    @Body() body: { materialId?: string }
  ) {
    return this.service.approveContent(sessionId, body.materialId);
  }

  @Get(':id/content')
  async getSessionContent(
    @Param('id') sessionId: string,
    @Query('materialId') materialId?: string
  ) {
    return this.service.getSessionContent(sessionId, materialId);
  }

  @Post('session/:id/delete')
  async deleteSession(@Param('id') sessionId: string) {
    return this.service.deleteSession(sessionId);
  }

  @Patch('session/:id/publish-material')
  async publishMaterial(
    @Param('id') sessionId: string,
    @Body() body: { materialId?: string }
  ) {
    return this.service.publishMaterial(sessionId, body.materialId);
  }

  @Patch('session/:id/publish-content')
  async publishContent(@Param('id') sessionId: string) {
    return this.service.publishContent(sessionId);
  }

  @Get('published/:workshopId')
  async getPublishedContent(@Param('workshopId') workshopId: string) {
    return this.service.getPublishedContentForWorkshop(workshopId);
  }
}
