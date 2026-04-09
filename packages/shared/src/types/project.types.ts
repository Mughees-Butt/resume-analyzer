// ─────────────────────────────────────────────────────────────
// Test Project Assignment
// ─────────────────────────────────────────────────────────────

export interface TestProject {
  id: string
  title: string
  summary: string
  techStack: string[]
  requirements: string[]
  bonusGoals: string[]
  evaluationRubric: RubricItem[]
  estimatedHours: number
  difficulty: 'junior' | 'mid' | 'senior' | 'lead'
}

export interface RubricItem {
  criterion: string
  description: string
  weight: 'low' | 'medium' | 'high'
}

export interface ProjectSubmission {
  id: string
  projectId: string
  candidateName: string
  repositoryUrl?: string
  submittedAt: string
  reviewStatus: 'pending' | 'reviewing' | 'complete'
  reviewResult?: ProjectReviewResult
}

export interface ProjectReviewResult {
  overallScore: number
  summary: string
  rubricScores: RubricScore[]
  strengths: string[]
  improvements: string[]
  recommendation: 'pass' | 'borderline' | 'reject'
}

export interface RubricScore {
  criterion: string
  score: number
  notes: string
}
