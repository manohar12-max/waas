import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CollegesModule } from './colleges/colleges.module';
import { DivisionsModule } from './divisions/divisions.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ForumModule } from './forum/forum.module';

import { BullModule } from '@nestjs/bullmq';
import { SessionContentModule } from './workshops/session-content/session-content.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    UsersModule,
    AuthModule,
    CollegesModule,
    DivisionsModule,
    WorkshopsModule,
    AssignmentsModule,
    SessionContentModule,
    ForumModule,
    SandboxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
