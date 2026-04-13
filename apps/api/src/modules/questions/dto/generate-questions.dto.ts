// DTO for POST /api/questions/generate
// profile is required — the CandidateProfile extracted by /api/resume/analyse.
// jobDescription is optional — its presence instructs Claude to weight question
// categories toward the JD gaps identified in Mode 2.

import { IsObject, IsOptional, IsString, MinLength } from 'class-validator'
import type { CandidateProfile } from '@resume-analyzer/shared'

export class GenerateQuestionsDto {
  // The full CandidateProfile produced by AnalysisService.
  // Deep validation is intentionally omitted — the profile comes from our own
  // /analyse endpoint and was already validated there.
  @IsObject()
  profile!: CandidateProfile

  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Job description is too short to be useful.' })
  jobDescription?: string
}
