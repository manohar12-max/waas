import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private groq: Groq;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not set in environment variables');
    }
    this.groq = new Groq({
      apiKey: apiKey || 'mock_key',
    });
  }

  async generateJson(prompt: string, model: string = 'llama-3.3-70b-versatile'): Promise<any> {
    this.logger.log(`Generating JSON with Groq model ${model}`);
    
    if (this.configService.get('USE_MOCK_AI') === 'true') {
      this.logger.log('USE_MOCK_AI is enabled. Returning mock NAAC report.');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate thinking
      return {
        titlePage: {
          workshopName: "Mock Workshop",
          college: "Mock College",
          department: "Computer Science",
          dateRange: "20th - 22nd April 2026",
          naacCriterion: "Criterion III: Research, Innovations & Extension"
        },
        introduction: "This is a mock introduction generated because USE_MOCK_AI is enabled. In a production environment, this would be a high-fidelity synthesis of your workshop materials, including deep-scanned PDF topics and participant engagement metrics.",
        sessionDetails: {
          resourcePersons: [{ name: "Dr. Mock AI", designation: "Testing Specialist", topic: "Asynchronous Workflows" }],
          summary: "The sessions covered the basics of background processing and real-time dashboard updates.",
          supportingDocs: { officialNotice: true, attendanceSheet: true, photos: 3 }
        },
        participantProfile: { local: 10, outstation: 5, total: 15, summary: "A diverse group of participants attended." },
        feedbackSummary: "Overall feedback was positive, highlighting the speed of the mock generation system.",
        outcome: "Participants learned how to toggle mock modes and monitor background jobs."
      };
    }

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that always responds with valid JSON. Do not include any markdown formatting like ```json or any other text outside the JSON object.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: model,
        response_format: { type: 'json_object' },
      });

      const content = chatCompletion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned empty response');
      }

      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`Groq generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateText(prompt: string, model: string = 'llama-3.3-70b-versatile'): Promise<string> {
    this.logger.log(`Generating text with Groq model ${model}`);
    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: model,
      });

      return chatCompletion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error(`Groq generation failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
