// ─────────────────────────────────────────────────────────────
// Interview Questions
// ─────────────────────────────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'expert'

export type QuestionCategory =
  | 'dsa'
  | 'system-design'
  | 'language-specific'
  | 'framework-specific'
  | 'database'
  | 'devops'
  | 'behavioral'
  | 'general'

export interface InterviewQuestion {
  id: string
  question: string
  difficulty: Difficulty
  category: QuestionCategory
  topic: string
  hint?: string
}

export interface QuestionSet {
  beginner: InterviewQuestion[]
  intermediate: InterviewQuestion[]
  expert: InterviewQuestion[]
}
