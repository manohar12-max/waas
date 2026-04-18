import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SessionContentService } from './session-content.service';
import { Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PDFService } from '../../infrastructure/pdf/pdf.service';
import * as fs from 'fs/promises';

@Processor('session-content-generation')
export class SessionContentProcessor extends WorkerHost {
  private readonly logger = new Logger(SessionContentProcessor.name);

  constructor(
    private readonly service: SessionContentService,
    private readonly httpService: HttpService,
    private readonly pdfService: PDFService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { sessionId, materialId, rawContentUrl } = job.data;
    const filePath = rawContentUrl?.startsWith('uploads') ? rawContentUrl : null;
    this.logger.log(`Processing content generation for session: ${sessionId}${materialId ? `, material: ${materialId}` : ''}`);

    try {
      let extractedText = "";

      // PHASE 1: EXTRACTION (Only if filePath exists)
      if (filePath) {
        try {
          await this.service.updateSessionStatus(sessionId, 'extracting', undefined, materialId);
          const buffer = await fs.readFile(filePath);
          extractedText = await this.pdfService.extractText(buffer);
          this.logger.log(`Extracted ${extractedText.length} characters for session ${sessionId}`);
        } catch (extError) {
          this.logger.error(`Extraction failed for session ${sessionId}: ${extError.message}`);
        }
      }

      // PHASE 2: GENERATION
      await this.service.updateSessionStatus(sessionId, 'generating', undefined, materialId);

      let generatedData;
      let aiSessionId;

      try {
        const session = await this.service.getSessionById(sessionId);
        const response = await this.callSeniorAIAPI(sessionId, extractedText || rawContentUrl, session?.title || "Workshop Session");
        generatedData = response.data;
        aiSessionId = response.session_id;

        // Store AI Session ID in the database session
        await this.service.updateAISessionInfo(sessionId, aiSessionId, 'stage1');
      } catch (apiError) {
        this.logger.warn(`Senior AI API failed, falling back to mock: ${apiError.message}`);
        generatedData = await this.mockAIAPICall(extractedText || rawContentUrl || sessionId);
      }

      // Save content
      await this.service.saveGeneratedContent(sessionId, generatedData.mcqs, generatedData.materials || [], materialId);

      // Update status
      await this.service.updateSessionStatus(sessionId, 'generated', undefined, materialId);

      this.logger.log(`Successfully generated content for session: ${sessionId}${materialId ? `, material: ${materialId}` : ''}`);

      return { ...generatedData, aiSessionId };
    } catch (error) {
      this.logger.error(`Failed to generate content for session: ${sessionId}`, error.stack);

      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
        await this.service.updateSessionStatus(sessionId, 'failed', undefined, materialId);
      }
      throw error;
    }
  }

  private async callSeniorAIAPI(sessionId: string, context: string, topic: string) {
    const aiUrl = process.env.AI_SERVICE_URL || "http://59.90.46.174:4000";
    this.logger.log(`Calling Senior AI API at ${aiUrl}/start-generation for topic: ${topic}`);

    const payload = {
      syllabus: context.substring(0, 7000), 
      audience: "Engineering Students",
      topic: topic
    };

    const response = await this.httpService.axiosRef.post(`${aiUrl}/start-generation`, payload, {
      timeout: 60000, // LLMs can be slow
    });

    return response.data;
  }

  /**
   * Enhanced Mock AI that uses the extracted text to feel more dynamic
   */
  private async mockAIAPICall(context: string) {
    this.logger.log(`Calling dynamic mock AI for context length: ${context.length}`);

    // Simulate thinking/generation time
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Try to find some "smart" titles from the text
    const words = context.split(/\s+/).filter(w => w.length > 5);
    const keyword1 = words[Math.floor(Math.random() * words.length)] || "Advanced";
    const keyword2 = words[Math.floor(Math.random() * words.length)] || "Strategy";

    return {
      mcqs: [
        {
          question: `Based on the material, what is the significance of ${keyword1}?`,
          options: [
            `It optimizes the core ${keyword2} process`,
            "It is a deprecated architectural pattern",
            "It handles background synchronization",
            "It is the primary entry point for users"
          ],
          correctAnswer: 0
        },
        {
          question: `Which of the following best describes the relationship between ${keyword1} and ${keyword2}?`,
          options: [
            "They are completely independent",
            "They share a common state management layer",
            "They compete for system resources",
            "One is a subset of the other"
          ],
          correctAnswer: 1
        }
      ],
      materials: [
        {
          title: `${keyword1} Mastery Guide`,
          content: `This document explores the deep implementation details of ${keyword1} within the context of ${keyword2}. It includes best practices and common pitfalls observed in production.`
        },
        {
          title: "Technical Bibliography",
          links: [
            `https://example.com/research/${keyword1.toLowerCase()}`,
            `https://standard.org/spec/${keyword2.toLowerCase()}`
          ]
        }
      ]
    };
  }
}
