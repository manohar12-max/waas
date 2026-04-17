import { Injectable, Logger, BadRequestException } from '@nestjs/common';
// Use require for compatibility with CommonJS and the specific pdf-parse export structure
const pdf = require('pdf-parse');

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  /**
   * Extracts text from a PDF buffer.
   * @param buffer PDF file buffer
   * @returns Extracted and cleaned text
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      
      if (!data || !data.text) {
        throw new BadRequestException('Could not extract text from PDF. File might be empty or corrupted.');
      }

      // High-Depth Cleaning (Same logic as reference project)
      const cleanText = data.text
        .replace(/\f/g, '\n') // Handle form feeds
        .replace(/Page \d+ (of \d+)?/gi, '') // Remove page numbers
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();

      if (cleanText.length < 50) {
        throw new BadRequestException('Extracted text is too short. Please upload a more detailed document.');
      }

      this.logger.log(`Successfully extracted ${cleanText.length} characters from PDF.`);
      return cleanText;
    } catch (error: any) {
      this.logger.error('PDF Extraction Error:', error.message);
      throw new BadRequestException('Error processing PDF: ' + error.message);
    }
  }

  /**
   * Chunks text into manageable pieces for AI context
   */
  chunkText(text: string, maxLength: number = 10000): string[] {
    const chunks: string[] = [];
    let index = 0;
    while (index < text.length) {
      chunks.push(text.substring(index, index + maxLength));
      index += maxLength;
    }
    return chunks;
  }
}
