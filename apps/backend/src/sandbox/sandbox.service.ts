import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { SandboxProject, SandboxProjectDocument } from './project.schema';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly judge0Url: string;
  private readonly judge0ApiKey: string;

  // Mapping of common languages to Judge0 IDs
  private readonly languageMap: Record<string, number> = {
    javascript: 93, // Node.js 18.15.0
    nodejs: 93,
    python: 92, // Python 3.11.2
    python3: 92,
    cpp: 105,   // GCC 14.1.0
    java: 91,    // JDK 17.0.6
    c: 103,      // GCC 14.1.0
    dart: 90,    // Dart 2.19.6
  };

  constructor(
    @InjectModel(SandboxProject.name) private projectModel: Model<SandboxProjectDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.judge0Url = (this.configService.get<string>('JUDGE0_API_URL') || 'https://judge0-ce.p.sulu.sh').trim();
    this.judge0ApiKey = (this.configService.get<string>('JUDGE0_API_KEY') || '').trim();
    
    if (this.judge0ApiKey) {
      this.logger.log(`Sandbox initialized with key (ends with: ...${this.judge0ApiKey.slice(-4)})`);
    }
  }

  async runCode(language: string, sourceCode: string) {
    const languageId = this.languageMap[language.toLowerCase()];
    
    if (!languageId) {
      throw new HttpException(
        `Language '${language}' is not supported.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!sourceCode || sourceCode.length > 50000) {
      throw new HttpException(
        'Invalid source code or code too long.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (this.judge0ApiKey) {
        headers['x-rapidapi-key'] = this.judge0ApiKey;
        // Automatically set host if using RapidAPI
        if (this.judge0Url.includes('rapidapi.com')) {
          try {
            headers['x-rapidapi-host'] = new URL(this.judge0Url).hostname;
          } catch (e) {
            // Fallback if URL is not a full URL
          }
        }
      }

      this.logger.log(`Executing code via Judge0: ${this.judge0Url}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.judge0Url}/submissions?base64_encoded=true&wait=true`,
          {
            source_code: Buffer.from(sourceCode).toString('base64'),
            language_id: languageId,
          },
          { headers },
        ),
      );

      const result = response.data;

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        message: result.message,
        status: result.status,
        time: result.time,
        memory: result.memory,
      };
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMsg = errorData?.message || errorData?.error || error.message;
      
      this.logger.error(`Judge0 API Error: ${errorMsg}`);
      if (errorData) {
        this.logger.error('Full Error Data:', JSON.stringify(errorData));
      }

      throw new HttpException(
        {
          status: 'error',
          message: 'Execution sandbox error',
          details: errorMsg,
          provider: this.judge0Url
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createProject(name: string, language: string, userId: string): Promise<SandboxProjectDocument> {
    this.logger.log(`Creating project '${name}' for user ${userId}`);
    const project = new this.projectModel({
      name,
      language,
      userId: new Types.ObjectId(userId),
      code: this.getDefaultCode(language),
    });
    return project.save();
  }

  async getProject(id: string): Promise<SandboxProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    return project;
  }

  async updateProject(id: string, code: string): Promise<SandboxProjectDocument> {
    const project = await this.projectModel.findByIdAndUpdate(
      id,
      { code },
      { returnDocument: 'after' },
    ).exec();
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }
    return project;
  }

  async listProjects(userId: string): Promise<SandboxProjectDocument[]> {
    return this.projectModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  private getDefaultCode(language: string): string {
    const templates: Record<string, string> = {
      javascript: `// Welcome to your JavaScript project\nconsole.log("Hello, World!");`,
      python: `# Welcome to your Python project\nprint("Hello, World!")`,
      cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
      c: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
      dart: `void main() {\n  print('Hello, World!');\n}`,
    };
    return templates[language.toLowerCase()] || '';
  }
}
