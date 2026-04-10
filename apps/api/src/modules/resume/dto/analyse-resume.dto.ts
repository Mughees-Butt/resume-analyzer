// DTO for POST /api/resume/analyse
// resumeText is required — extracted by Phase 1 before this call is made.
// jobDescription is optional — its presence switches Claude to Mode 2
// (resume + JD fit analysis).

import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator'

export class AnalyseResumeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Resume text is too short to analyse.' })
  resumeText!: string

  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Job description is too short to be useful.' })
  jobDescription?: string
}
