// DTO for POST /api/questions/generate
// profile is required — the CandidateProfile extracted by /api/resume/analyse.
// jobDescription is optional — its presence instructs Claude to weight question
// topics toward the JD gaps identified in Mode 2.

import {
  IsArray,
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
  @IsArray() languages!: string[]
  @IsArray() frameworks!: string[]
  @IsArray() tools!: string[]
  @IsArray() cloud!: string[]
  @IsArray() databases!: string[]
  @IsArray() other!: string[]
}

// ── Profile nested DTO ────────────────────────────────────────────────────────

class CandidateProfileDto {
  @IsString()
  @IsNotEmpty()
  name!: string

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

  @ValidateNested()
  @Type(() => TechStackDto)
  primaryStack!: TechStackDto

  @ValidateNested()
  @Type(() => TechStackDto)
  secondaryStack!: TechStackDto

  @IsArray()
  strongZones!: string[]
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
