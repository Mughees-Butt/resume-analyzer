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
  id?: string
  // Two-part question structure:
  // concept    — knowledge check ("What is X?" / "What are the pros and cons of Y?")
  // application — follow-up ("How would you implement X?" / "How would you debug Y?")
  concept: string
  application: string
  topic: string
  hint?: string
  // Set to true when the interviewer asks this question during the session (default: false)
  asked: boolean
}

// 5 questions per difficulty tier per category = 15 questions per category
export interface CategoryGroup {
  category: QuestionCategory
  beginner: InterviewQuestion[]      // 5
  intermediate: InterviewQuestion[]  // 5
  expert: InterviewQuestion[]        // 5
}

// Top-level questions payload returned by POST /api/resume/questions
export interface InterviewQuestions {
  categories: CategoryGroup[]
}

/**
 * @deprecated Use CategoryGroup instead.
 * QuestionSet grouped only by difficulty without category context.
 */
export interface QuestionSet {
  beginner: InterviewQuestion[]
  intermediate: InterviewQuestion[]
  expert: InterviewQuestion[]
}
