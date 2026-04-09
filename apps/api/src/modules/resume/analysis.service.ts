import {
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import type { CandidateProfile } from '@resume-analyzer/shared'

const MODEL = 'claude-sonnet-4-6'

// The JSON schema description embedded in the prompt so Claude knows
// exactly what shape to return. Defined once, reused in both modes.
const PROFILE_SCHEMA = `{
  "name": "string — candidate full name",
  "email": "string or null",
  "currentRole": "string or null — most recent job title",
  "yearsOfExperience": number,
  "experienceLevel": "junior" | "mid" | "senior" | "lead",
  "specialization": "frontend" | "backend" | "fullstack" | "mobile" | "devops" | "ml" | "data" | "unknown",
  "primaryStack": {
    "languages": ["e.g. TypeScript"],
    "frameworks": ["e.g. NestJS"],
    "tools": ["e.g. Docker"],
    "cloud": ["e.g. AWS"],
    "databases": ["e.g. PostgreSQL"],
    "other": []
  },
  "secondaryStack": {
    "languages": [],
    "frameworks": [],
    "tools": [],
    "cloud": [],
    "databases": [],
    "other": []
  },
  "strongZones": ["3–5 key strength areas, e.g. API Design, System Architecture"]
}`

const FIT_ANALYSIS_SCHEMA = `  "fitAnalysis": {
    "alignedSkills": ["candidate skills the JD explicitly requires"],
    "gaps": ["JD requirements the candidate appears to lack"],
    "summary": "1–2 sentence fit assessment for the interviewer"
  }`

@Injectable()
export class AnalysisService {
  // Lazily initialised — created on first call, not at module load time.
  // This prevents a missing ANTHROPIC_API_KEY from crashing the NestJS
  // bootstrap and taking down unrelated routes (/upload, /text).
  private _client: Anthropic | null = null

  private get client(): Anthropic {
    if (!this._client) {
      const apiKey = process.env['ANTHROPIC_API_KEY']
      if (!apiKey) {
        throw new InternalServerErrorException(
          'ANTHROPIC_API_KEY is not configured. Add it to apps/api/.env.',
        )
      }
      this._client = new Anthropic({ apiKey })
    }
    return this._client
  }

  async analyseResume(resumeText: string, jobDescription?: string): Promise<CandidateProfile> {
    const hasJd = Boolean(jobDescription?.trim())

    const userMessage = hasJd
      ? this.buildJdPrompt(resumeText, jobDescription!)
      : this.buildResumeOnlyPrompt(resumeText)

    let raw: string
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system:
          'You are an expert technical recruiter and software engineer. ' +
          'Analyse resumes and job descriptions to produce structured candidate profiles. ' +
          'Always respond with valid JSON only — no explanation, no markdown, no code blocks.',
        messages: [{ role: 'user', content: userMessage }],
      })

      const block = response.content[0]
      if (block.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }
      raw = block.text
    } catch (err) {
      throw new InternalServerErrorException(
        `Claude API error: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    return this.parseProfile(raw, hasJd)
  }

  // ─── Prompt builders ────────────────────────────────────────────────────────

  private buildResumeOnlyPrompt(resumeText: string): string {
    return `Analyse this software engineering resume and extract a structured candidate profile.

Resume:
"""
${resumeText}
"""

Return a JSON object with exactly this shape:
${PROFILE_SCHEMA}

Return ONLY the JSON. No explanation, no markdown.`
  }

  private buildJdPrompt(resumeText: string, jobDescription: string): string {
    return `Analyse this software engineering resume against the provided job description.

Resume:
"""
${resumeText}
"""

Job Description:
"""
${jobDescription}
"""

Return a JSON object with exactly this shape (include fitAnalysis because a JD was provided):
${PROFILE_SCHEMA.slice(0, -1)},
${FIT_ANALYSIS_SCHEMA}
}

Return ONLY the JSON. No explanation, no markdown.`
  }

  // ─── Response parser ────────────────────────────────────────────────────────

  private parseProfile(raw: string, expectFitAnalysis: boolean): CandidateProfile {
    let parsed: unknown
    try {
      // Strip accidental markdown code fences if Claude adds them despite instructions
      const cleaned = raw
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      throw new UnprocessableEntityException(
        'Claude returned a response that could not be parsed. Please try again.',
      )
    }

    if (!this.isValidProfile(parsed, expectFitAnalysis)) {
      throw new UnprocessableEntityException(
        'Claude returned an incomplete profile. Please try again.',
      )
    }

    return parsed as CandidateProfile
  }

  private isValidProfile(value: unknown, expectFitAnalysis: boolean): boolean {
    if (typeof value !== 'object' || value === null) return false
    const p = value as Record<string, unknown>

    const hasRequiredFields =
      typeof p['name'] === 'string' &&
      typeof p['yearsOfExperience'] === 'number' &&
      typeof p['experienceLevel'] === 'string' &&
      typeof p['specialization'] === 'string' &&
      Array.isArray(p['strongZones']) &&
      this.isValidStack(p['primaryStack']) &&
      this.isValidStack(p['secondaryStack'])

    if (!hasRequiredFields) return false
    if (!expectFitAnalysis) return true

    // Mode 2 — validate fitAnalysis is present and well-shaped
    const fit = p['fitAnalysis'] as Record<string, unknown> | undefined
    return (
      typeof fit === 'object' &&
      fit !== null &&
      Array.isArray(fit['alignedSkills']) &&
      Array.isArray(fit['gaps']) &&
      typeof fit['summary'] === 'string'
    )
  }

  private isValidStack(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false
    const s = value as Record<string, unknown>
    return (
      Array.isArray(s['languages']) &&
      Array.isArray(s['frameworks']) &&
      Array.isArray(s['tools']) &&
      Array.isArray(s['cloud']) &&
      Array.isArray(s['databases']) &&
      Array.isArray(s['other'])
    )
  }
}
