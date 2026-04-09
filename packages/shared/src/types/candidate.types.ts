// ─────────────────────────────────────────────────────────────
// Candidate — core types shared between web and api
// ─────────────────────────────────────────────────────────────

export type ExperienceLevel = 'junior' | 'mid' | 'senior' | 'lead'

export type Specialization =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'devops'
  | 'ml'
  | 'data'
  | 'unknown'

export interface TechStack {
  languages: string[]
  frameworks: string[]
  tools: string[]
  cloud: string[]
  databases: string[]
  other: string[]
}

// Present when the analysis was run with a Job Description (Mode 2)
export interface FitAnalysis {
  // Candidate skills that the JD explicitly requires
  alignedSkills: string[]
  // JD requirements the candidate does not appear to have
  gaps: string[]
  // 1–2 sentence fit summary for the interviewer
  summary: string
}

export interface CandidateProfile {
  id?: string
  name: string
  email?: string
  currentRole?: string
  yearsOfExperience: number
  experienceLevel: ExperienceLevel
  specialization: Specialization
  primaryStack: TechStack
  secondaryStack: TechStack
  strongZones: string[]
  education?: Education[]
  certifications?: string[]
  // Only present in Mode 2 (resume + JD)
  fitAnalysis?: FitAnalysis
  createdAt?: string
}

export interface Education {
  degree: string
  institution: string
  year?: number
}
