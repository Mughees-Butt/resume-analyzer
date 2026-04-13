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
  // Returns a structured InterviewQuestions set:
  //   4–5 categories × 3 tiers × 5 questions = 60–75 questions total.
  // Each question has concept (theory) + application (implementation follow-up).
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
