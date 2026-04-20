import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AIServiceClient {
  private readonly baseUrl: string;
  private readonly axiosInstance: any;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:4000';
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 Minutes
    });
  }

  async startGeneration(payload: {
    syllabus: string;
    slides_text?: string;
    audience: string;
    topic: string;
  }) {
    return this.requestWithRetry('post', '/start-generation', payload);
  }

  async reviewStage1(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    return this.requestWithRetry('post', '/review-stage-1', {
      session_id: sessionId,
      action,
      edited_data: editedData,
    });
  }

  async reviewStage2(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    return this.requestWithRetry('post', '/review-stage-2', {
      session_id: sessionId,
      action,
      edited_data: editedData,
    });
  }

  async getFinalOutput(sessionId: string) {
    return this.requestWithRetry('get', `/final-output/${sessionId}`);
  }

  private async requestWithRetry(method: 'get' | 'post', url: string, data?: any, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await (method === 'get' 
          ? this.axiosInstance.get(url) 
          : this.axiosInstance.post(url, data));
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        const isRetryable = status >= 500 || error.code === 'ECONNABORTED' || error.message.includes('timeout');
        
        if (i === attempts - 1 || !isRetryable) {
          this.handleError(error, url);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  private handleError(error: any, context: string) {
    console.error(`AI Service Error [${context}]:`, error.response?.data || error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || `AI Service failed during ${context}`;
    throw new InternalServerErrorException(message);
  }
}
