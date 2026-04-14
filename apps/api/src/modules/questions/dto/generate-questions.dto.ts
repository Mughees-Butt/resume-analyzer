// DTO for POST /api/questions/generate
// profile is required — the CandidateProfile extracted by /api/resume/analyse.
// jobDescription is optional — its presence instructs Claude to weight question
// topics toward the JD gaps identified in Mode 2.

import {
  IsArray,
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { ExperienceLevel, Specialization } from '@resume-analyzer/shared'

// ── TechStack nested DTO ──────────────────────────────────────────────────────

class TechStackDto {
  @IsArray() @IsString({ each: true }) languages!: string[]
  @IsArray() @IsString({ each: true }) frameworks!: string[]
  @IsArray() @IsString({ each: true }) tools!: string[]
  @IsArray() @IsString({ each: true }) cloud!: string[]
  @IsArray() @IsString({ each: true }) databases!: string[]
  @IsArray() @IsString({ each: true }) other!: string[]
}

// ── FitAnalysis nested DTO ────────────────────────────────────────────────────

class FitAnalysisDto {
  @IsArray()
  @IsString({ each: true })
  alignedSkills!: string[]

  @IsArray()
  @IsString({ each: true })
  gaps!: string[]

  @IsString()
  @IsNotEmpty()
  summary!: string
}

// ── Profile nested DTO ────────────────────────────────────────────────────────

class CandidateProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  // Validated for completeness; intentionally omitted from the AI prompt
  // (experienceLevel string is more meaningful to Claude than a raw number).
  @IsNumber()
  @Min(0)
  yearsOfExperience!: number

  @IsIn(['junior', 'mid', 'senior', 'lead'], {
    message: 'profile.experienceLevel must be junior, mid, senior, or lead.',
  })
  experienceLevel!: ExperienceLevel

  @IsIn(['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ml', 'data', 'unknown'], {
    message: 'profile.specialization is not a recognised value.',
  })
  specialization!: Specialization

  @IsDefined()
  @ValidateNested()
  @Type(() => TechStackDto)
  primaryStack!: TechStackDto

  @IsDefined()
  @ValidateNested()
  @Type(() => TechStackDto)
  secondaryStack!: TechStackDto

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  strongZones!: string[]

  // Only present in Mode 2 (resume + JD). The whitelist pipe would strip this
  // without the explicit field declaration, causing fitAnalysis.gaps to be lost
  // and the jdGaps section of the prompt to silently disappear.
  @IsOptional()
  @ValidateNested()
  @Type(() => FitAnalysisDto)
  fitAnalysis?: FitAnalysisDto
}

// ── Root DTO ──────────────────────────────────────────────────────────────────

export class GenerateQuestionsDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CandidateProfileDto)
  profile!: CandidateProfileDto

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20, { message: 'Job description is too short to be useful.' })
  jobDescription?: string
}
