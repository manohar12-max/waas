import { Injectable, Logger, BadRequestException } from '@nestjs/common';
const pdf = require('pdf-parse');
const officeParser = require('officeparser');

@Injectable()
export class PDFService {
  private readonly logger = new Logger(PDFService.name);

  /**
   * Extracts text from a PDF buffer.
   */
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const parser = new pdf.PDFParse({ data: buffer });
      const result = await parser.getText();
      if (!result || !result.text) throw new BadRequestException('Could not extract text from PDF.');
      return this.cleanText(result.text);
    } catch (error: any) {
      this.logger.error('PDF Extraction Error:', error.message);
      throw new BadRequestException('Error processing PDF: ' + error.message);
    }
  }

  /**
   * Extracts text from Office files (PPTX, DOCX)
   */
  async extractFromOffice(filePath: string): Promise<string> {
    try {
      const text = await officeParser.parseOfficePromise(filePath);
      if (!text) throw new BadRequestException('Could not extract text from Office file.');
      return this.cleanText(text);
    } catch (error: any) {
      this.logger.error('Office Extraction Error:', error.message);
      throw new BadRequestException('Error processing Office file: ' + error.message);
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\f/g, '\n')
      .replace(/Page \d+ (of \d+)?/gi, '')
      .replace(/\n\s*\n/g, '\n')
      .replace(/\s+/g, ' ')
      .trim();
  }

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
