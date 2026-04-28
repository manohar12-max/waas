import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AIServiceClient {
  private readonly baseUrl: string;
  private readonly axiosInstance: any;
  private readonly useMock: boolean;

  constructor() {
    this.baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:4000').replace('localhost', '127.0.0.1');
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
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        session_id: `mock-session-${Date.now()}`,
        data: this.getMockData(payload.topic),
      };
    }
    const response = await this.requestWithRetry('post', '/start-generation', payload);
    return response;
  }

  async reviewStage1(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    if (this.useMock) {
      console.log('[AI Mock] Review Stage 1:', action);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { session_id: sessionId, data: editedData };
    }

    // Clean and Nest payload: Hybrid approach to ensure compatibility
    const contentData = editedData ? {
      ...editedData,
      application_problem: editedData.application_problem || editedData.applicationProblem,
      mcqs: (editedData.mcqs || []).map((q: any) => ({
        ...q,
        concept: q.concept || q.topic || "General",
        difficulty: q.difficulty || "medium",
        learning_objective: q.learning_objective || q.learningObjective || "Topic understanding",
        correct: q.correct || (q.options && q.options[q.correctAnswer]) || q.correct
      })),
      meta: editedData.meta || { los: [], validation_passed: true }
    } : undefined;

    const payload = {
      session_id: sessionId,
      action,
      edited_data: contentData,
      ...contentData
    };
    console.log('[AI CLIENT] HYBRID PAYLOAD:', JSON.stringify(payload, null, 2));
    return await this.requestWithRetry('post', '/review-stage-1', payload);
  }

  async reviewStage2(sessionId: string, action: 'continue' | 'edit', editedData?: any) {
    if (this.useMock) {
      console.log('[AI Mock] Review Stage 2:', action);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { session_id: sessionId, data: editedData };
    }

    // Clean and Nest payload: Hybrid
    const contentData = editedData ? {
      ...editedData,
      application_problem: editedData.application_problem || editedData.applicationProblem,
      mcqs: (editedData.mcqs || []).map((q: any) => ({
        ...q,
        concept: q.concept || q.topic || "General",
        difficulty: q.difficulty || "medium",
        learning_objective: q.learning_objective || q.learningObjective || "Topic understanding",
        correct: q.correct || (q.options && q.options[q.correctAnswer]) || q.correct
      })),
      meta: editedData.meta || { los: [], validation_passed: true }
    } : undefined;

    const payload = {
      session_id: sessionId,
      action,
      edited_data: contentData,
      ...contentData
    };
    console.log('[AI CLIENT STAGE 2] HYBRID PAYLOAD:', JSON.stringify(payload, null, 2));
    return await this.requestWithRetry('post', '/review-stage-2', payload);
  }

  async getFinalOutput(sessionId: string) {
    if (this.useMock) {
      console.log('[AI Mock] Getting Final Output');
      return this.getMockData("Final Result");
    }
    const response = await this.requestWithRetry('get', `/final-output/${sessionId}`);
    return response;
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
        title: "Standard Problem",
        problem_statement: `Create a real-world scenario where ${topic} can be applied to solve a logistics problem.`,
        expected_time_minutes: 10,
        concepts_used: ["Basics"],
        solution_steps: ["Initialize environment", "Define agent goals", "Connect to data sources", "Implement control loop"],
        final_answer: "Solved environment",
        grading_rubric: [{ step: "Initialization", marks: 5 }]
      },
      slides: [
        { title: `Welcome to ${topic}`, content: "Overview of core concepts and architectures." },
        { title: "The Agent Loop", content: "Perceive -> Reason -> Act -> Feedback." }
      ],
      meta: {
        los: ["Understand basics"],
        validation_passed: true
      }
    };
  }

  private async requestWithRetry(method: 'get' | 'post', url: string, data?: any, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`[AI BACKEND CALL] -> ${method.toUpperCase()} ${this.baseUrl}${url}`);
        if (data) console.log(`[AI REQUEST BODY]:`, JSON.stringify(data, null, 2));

        const response = await (method === 'get'
          ? this.axiosInstance.get(url)
          : this.axiosInstance.post(url, data));

        console.log(`[AI RESPONSE FROM 4000]:`, JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (error) {
        const status = error.response?.status;
        console.warn(`[AI Client] Attempt ${i + 1} failed: ${status || error.message}`);

        const isRetryable = status >= 500 || error.code === 'ECONNABORTED' || error.message.includes('timeout');

        if (i === attempts - 1 || !isRetryable) {
          this.handleError(error, url, data);
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  private handleError(error: any, context: string, payload?: any) {
    const status = error.response?.status || 500;
    const responseData = error.response?.data;

    console.error('--- AI Service Error Details ---');
    console.error(`Context: ${context}`);
    console.error(`Status: ${status}`);
    console.error(`Payload Sent:`, JSON.stringify(payload, null, 2));
    console.error(`Error Response:`, JSON.stringify(responseData, null, 2));
    console.error('--------------------------------');

    const message = responseData?.message || responseData?.error || `AI Service failed during ${context}`;
    throw new InternalServerErrorException(message);
  }
}
