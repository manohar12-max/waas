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
import { AnnouncementsModule } from './announcements/announcements.module';
import { NaacReportsModule } from './naac-reports/naac-reports.module';
import { GlobalRulesModule } from './global-rules/global-rules.module';
import { SessionContentModule } from './workshops/session-content/session-content.module';
import { SandboxModule } from './sandbox/sandbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
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
    AnnouncementsModule,
    NaacReportsModule,
    GlobalRulesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

