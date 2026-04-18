import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { SandboxProject, SandboxProjectSchema } from './project.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: SandboxProject.name, schema: SandboxProjectSchema },
    ]),
  ],
  controllers: [SandboxController],
  providers: [SandboxService],
})
export class SandboxModule {}
