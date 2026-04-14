import { Controller, Post, Body } from '@nestjs/common'
import { QuestionsService } from './questions.service'
import { GenerateQuestionsDto } from './dto/generate-questions.dto'

// All routes in this controller are prefixed with /api/questions
// (the /api global prefix is set in main.ts)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  // ─────────────────────────────────────────────────────────────
  // POST /api/questions/generate
  // Accepts an extracted CandidateProfile + optional job description.
  // Returns a flat 15-question InterviewQuestions set:
  //   5 beginner + 5 intermediate + 4 standard expert + 1 structural expert.
  // Each question has concept (theory) + application (follow-up) + hint (interviewer-only).
  // All questions start with asked: false for session tracking.
  // ─────────────────────────────────────────────────────────────
  @Post('generate')
  async generateQuestions(@Body() dto: GenerateQuestionsDto) {
    const questions = await this.questionsService.generateQuestions(dto.profile, dto.jobDescription)

    return {
      success: true,
      mode: dto.jobDescription?.trim() ? 'jd' : 'resume-only',
      questions,
    }
  }
}
