// ─────────────────────────────────────────────────────────────
// Interview Questions
// ─────────────────────────────────────────────────────────────

// standard — concept + application knowledge check
// structural — design/flow thinking question tied to the candidate's actual experience
export type QuestionType = 'standard' | 'structural'

export interface InterviewQuestion {
  id?: string
  // Two-part question structure:
  // concept     — theory/knowledge check ("What is X?" / "What are the pros and cons of Y?")
  // application — implementation/fix/trade-off follow-up ("How would you implement X?" / "How would you debug Y?")
  concept: string
  application: string
  topic: string
  hint?: string
  type: QuestionType
  // Set to true when the interviewer asks this question during the session (default: false)
  asked: boolean
}

// Flat tier-based structure — 15 questions total:
//   beginner:     5 standard questions
//   intermediate: 5 standard questions
//   expert:       4 standard + 1 structural = 5 questions
export interface QuestionTier {
  beginner: InterviewQuestion[]
  intermediate: InterviewQuestion[]
  expert: InterviewQuestion[]
}

// Top-level questions payload returned by POST /api/questions/generate
export interface InterviewQuestions {
  tiers: QuestionTier
}
