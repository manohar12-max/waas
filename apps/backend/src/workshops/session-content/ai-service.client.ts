import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AIServiceClient {
  private readonly baseUrl: string;
  private readonly axiosInstance: any;
  private readonly useMock: boolean;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:4000';
    this.useMock = process.env.USE_MOCK_AI === 'true';
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
    if (this.useMock) {
      console.log('[AI Mock] Starting Generation for:', payload.topic);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      return {
        session_id: `mock-session-${Date.now()}`,
        data: this.getMockData(payload.topic),
      };
    }
    return this.requestWithRetry('post', '/start-generation', payload);
  }

  async reviewStage1(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    if (this.useMock) {
      console.log('[AI Mock] Review Stage 1:', action);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        session_id: sessionId,
        data: editedData || this.getMockData("Refined Topic"),
      };
    }
    return this.requestWithRetry('post', '/review-stage-1', {
      session_id: sessionId,
      action,
      edited_data: editedData,
    });
  }

  async reviewStage2(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    if (this.useMock) {
      console.log('[AI Mock] Review Stage 2:', action);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        session_id: sessionId,
        data: editedData || this.getMockData("Finalized Topic"),
      };
    }
    return this.requestWithRetry('post', '/review-stage-2', {
      session_id: sessionId,
      action,
      edited_data: editedData,
    });
  }

  async getFinalOutput(sessionId: string) {
    if (this.useMock) {
      console.log('[AI Mock] Getting Final Output');
      return this.getMockData("Final Result");
    }
    return this.requestWithRetry('get', `/final-output/${sessionId}`);
  }

  private getMockData(topic: string) {
    return {
      mcqs: [
        {
          question: `What is the primary goal of ${topic}?`,
          options: ["To automate everything", "To provide a feedback loop", "To increase complexity", "To reduce performance"],
          correctAnswer: 1,
        },
        {
          question: `Which component is most critical in ${topic}?`,
          options: ["External APIs", "Memory and State", "Hardcoded rules", "Sequential processing"],
          correctAnswer: 0,
        },
        {
          question: `How does ${topic} typically handle errors?`,
          options: ["By crashing", "By ignoring them", "Through self-correction and retry", "By asking the user every time"],
          correctAnswer: 2,
        }
      ],
      application_problem: {
        description: `Create a real-world scenario where ${topic} can be applied to solve a logistics problem.`,
        steps: ["Initialize environment", "Define agent goals", "Connect to data sources", "Implement control loop"]
      },
      slides: [
        { title: `Welcome to ${topic}`, content: "Overview of core concepts and architectures." },
        { title: "The Agent Loop", content: "Perceive -> Reason -> Act -> Feedback." }
      ],
      materials: [
        {
          title: `${topic} - Basics`,
          content: "Comprehensive guide to getting started with autonomous systems."
        },
        {
          title: "Advanced Topics",
          content: "Scaling agentic workflows across multiple nodes."
        }
      ]
    };
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
