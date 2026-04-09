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
  createdAt?: string
}

export interface Education {
  degree: string
  institution: string
  year?: number
}
