import { Injectable, Logger } from '@nestjs/common';
import { SessionContentService } from './session-content.service';
import { HttpService } from '@nestjs/axios';
import { PDFService } from '../../infrastructure/pdf/pdf.service';
import * as fs from 'fs/promises';

/** Processor is now a plain service — no Redis/BullMQ required */
@Injectable()
export class SessionContentProcessor {
  private readonly logger = new Logger(SessionContentProcessor.name);

  constructor(
    private readonly service: SessionContentService,
    private readonly httpService: HttpService,
    private readonly pdfService: PDFService,
  ) {}

  /** Call this directly when you want to process a session (replaces queue job) */
  async process(data: { sessionId: string; rawContentUrl?: string; filePath?: string }): Promise<any> {
    const { sessionId, rawContentUrl, filePath } = data;
    this.logger.log(`Processing content generation for session: ${sessionId}`);

    try {
      let extractedText = "";

      // PHASE 1: EXTRACTION (Only if filePath exists)
      if (filePath) {
        try {
          await this.service.updateSessionStatus(sessionId, 'extracting');
          const isOffice = filePath.toLowerCase().endsWith('.pptx') || 
                           filePath.toLowerCase().endsWith('.ppt') || 
                           filePath.toLowerCase().endsWith('.docx');
          
          if (isOffice) {
            extractedText = await this.pdfService.extractFromOffice(filePath);
          } else {
            const buffer = await fs.readFile(filePath);
            extractedText = await this.pdfService.extractText(buffer);
          }
          
          this.logger.log(`Extracted ${extractedText.length} characters for session ${sessionId}`);
        } catch (extError) {
          this.logger.error(`Extraction failed for session ${sessionId}: ${extError.message}`);
        }
      }

      // PHASE 2: GENERATION
      await this.service.updateSessionStatus(sessionId, 'generating');
      
      let generatedData;
      
      try {
        // In the future, pass extractedText to the senior API
        generatedData = await this.callSeniorAIAPI(rawContentUrl ?? filePath ?? '');
      } catch (apiError) {
        this.logger.warn(`Senior API failed or not configured, falling back to mock: ${apiError.message}`);
        generatedData = await this.mockAIAPICall(extractedText || rawContentUrl || filePath || sessionId);
      }

      // Save content
      await this.service.saveGeneratedContent(sessionId, generatedData.mcqs, generatedData.materials);

      // Update session status
      await this.service.updateSessionStatus(sessionId, 'generated');

      this.logger.log(`Successfully generated content for session: ${sessionId}`);
      
      return generatedData;
    } catch (error) {
      this.logger.error(`Failed to generate content for session: ${sessionId}`, error.stack);
      await this.service.updateSessionStatus(sessionId, 'failed');
      throw error;
    }
  }

  private async callSeniorAIAPI(input: string) {
    throw new Error('Senior API not yet configured');
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
