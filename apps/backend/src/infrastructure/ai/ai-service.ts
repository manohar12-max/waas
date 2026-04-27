import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AiMcq {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  learning_objective: string;
}

export interface AiApplicationProblem {
  title: string;
  problem_statement: string;
  expected_time_minutes: number;
  concepts_used: string[];
  solution_steps: string[];
  final_answer: string;
  grading_rubric: { step: string; marks: number }[];
}

export interface AiGenerationResponse {
  session_id: string;
  stage: string;
  content: {
    mcqs: AiMcq[];
    application_problem: AiApplicationProblem;
    slides: string[];
    meta: {
      los: string[];
      validation_passed: boolean;
    };
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:4000';

  /**
   * Starts the AI generation process
   */
  async startGeneration(payload: {
    syllabus: string;
    audience: string;
    topic: string;
    slides_text?: string;
  }): Promise<AiGenerationResponse> {
    try {
      this.logger.log(`Starting AI generation for topic: ${payload.topic}`);
      const response = await axios.post(`${this.baseUrl}/start-generation`, payload);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to start AI generation', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Submits a review (Stage 1 or 2)
   */
  async submitReview(
    sessionId: string,
    stage: 1 | 2,
    action: 'continue' | 'edit',
    editedData?: any,
  ): Promise<AiGenerationResponse> {
    try {
      const endpoint = stage === 1 ? 'review-stage-1' : 'review-stage-2';
      const response = await axios.post(`${this.baseUrl}/${endpoint}`, {
        session_id: sessionId,
        action,
        edited_data: editedData,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed AI review stage ${stage}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches the final output for a session
   */
  async getFinalOutput(sessionId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/final-output/${sessionId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get final AI output for ${sessionId}`, error.message);
      throw error;
    }
  }

  /**
   * Checks the health of the AI service
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data?.status === 'ok' || response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
