// ─────────────────────────────────────────────────────────────
// Analysis — result of processing a resume through Claude
// ─────────────────────────────────────────────────────────────

import type { CandidateProfile } from './candidate.types'
import type { InterviewQuestion } from './questions.types'
import type { TestProject } from './project.types'

export type AnalysisStatus = 'pending' | 'processing' | 'complete' | 'failed'

export interface AnalysisResult {
  id: string
  status: AnalysisStatus
  candidate: CandidateProfile
  questions: InterviewQuestion[]
  project: TestProject
  rawResumeText?: string
  createdAt: string
}

export interface CreateAnalysisDto {
  resumeText?: string
  fileName?: string
  // Optional — providing this activates Mode 2 (resume + JD fit analysis)
  jobDescription?: string
}
