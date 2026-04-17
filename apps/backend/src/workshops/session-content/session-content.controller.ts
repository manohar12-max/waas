import { Controller, Post, Get, Patch, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SessionContentService } from './session-content.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('sessions-content')
export class SessionContentController {
  constructor(private readonly service: SessionContentService) {}

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

  @Post(':id/generate')
  async triggerGeneration(@Param('id') sessionId: string) {
    return this.service.triggerGeneration(sessionId);
  }

  @Patch(':id/approve')
  async approveContent(@Param('id') sessionId: string) {
    return this.service.approveContent(sessionId);
  }

  @Get(':id/content')
  async getSessionContent(@Param('id') sessionId: string) {
    return this.service.getSessionContent(sessionId);
  }

  @Post('session/:id/delete')
  async deleteSession(@Param('id') sessionId: string) {
    return this.service.deleteSession(sessionId);
  }

  @Patch('session/:id')
  @UseInterceptors(FileInterceptor('file', {
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
    @Body() body: { title?: string; rawContentUrl?: string },
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.service.updateSession(id, {
      title: body.title,
      rawContentUrl: body.rawContentUrl,
      filePath: file?.path,
    });
  }
}
