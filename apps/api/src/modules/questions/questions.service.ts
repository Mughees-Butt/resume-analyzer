import {
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import type { CandidateProfile, InterviewQuestions, CategoryGroup } from '@resume-analyzer/shared'

const MODEL = 'claude-sonnet-4-6'

// Valid category values — must match the QuestionCategory union in shared types
const VALID_CATEGORIES = [
  'dsa',
  'system-design',
  'language-specific',
  'framework-specific',
  'database',
  'devops',
  'behavioral',
  'general',
] as const

// Schema constants — brace-free question body to allow clean composition
const QUESTION_ITEM_SCHEMA = `{
        "concept": "string — the theory/knowledge-check question (What is X? What are the pros and cons of Y?)",
        "application": "string — the implementation/fix/trade-off follow-up (How would you implement X? How would you debug Y?)",
        "topic": "string — specific topic label (e.g. \\"React hooks\\", \\"SQL joins\\")",
        "asked": false
      }`

const QUESTIONS_SCHEMA = `{
  "categories": [
    {
      "category": "one of: dsa | system-design | language-specific | framework-specific | database | devops | behavioral | general",
      "beginner": [${QUESTION_ITEM_SCHEMA}, "...5 total"],
      "intermediate": [${QUESTION_ITEM_SCHEMA}, "...5 total"],
      "expert": [${QUESTION_ITEM_SCHEMA}, "...5 total"]
    }
  ]
}`

@Injectable()
export class QuestionsService {
  // Lazily initialised — same pattern as AnalysisService.
  // Prevents a missing ANTHROPIC_API_KEY from crashing unrelated routes at bootstrap.
  private _client: Anthropic | null = null

  private get client(): Anthropic {
    if (!this._client) {
      const apiKey = process.env['ANTHROPIC_API_KEY']
      if (!apiKey?.trim()) {
        throw new InternalServerErrorException(
          'ANTHROPIC_API_KEY is not configured. Add it to apps/api/.env.',
        )
      }
      this._client = new Anthropic({ apiKey })
    }
    return this._client
  }

  async generateQuestions(
    profile: CandidateProfile,
    jobDescription?: string,
  ): Promise<InterviewQuestions> {
    const userMessage = this.buildPrompt(profile, jobDescription)

    let raw: string
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system:
          'You are an expert technical interviewer with deep knowledge of software engineering. ' +
          "Generate structured interview questions tailored to a candidate's profile. " +
          'Always respond with valid JSON only — no explanation, no markdown, no code blocks.',
        messages: [{ role: 'user', content: userMessage }],
      })

      const block = response.content[0]
      if (!block || block.type !== 'text') {
        throw new Error('Unexpected or empty response from Claude')
      }
      raw = block.text
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      console.error('[QuestionsService] Claude API error:', detail)
      throw new InternalServerErrorException(
        'The question generation service is temporarily unavailable. Please try again.',
      )
    }

    return this.parseQuestions(raw)
  }

  // ─── Prompt builder ─────────────────────────────────────────────────────────

  private buildPrompt(profile: CandidateProfile, jobDescription?: string): string {
    // Compact profile summary — only what Claude needs to target the questions
    const profileSummary = JSON.stringify(
      {
        name: profile.name,
        experienceLevel: profile.experienceLevel,
        specialization: profile.specialization,
        primaryStack: profile.primaryStack,
        strongZones: profile.strongZones,
        ...(profile.fitAnalysis ? { jdGaps: profile.fitAnalysis.gaps } : {}),
      },
      null,
      2,
    )

    const hasJd = Boolean(jobDescription?.trim())
    const safeJd = hasJd ? jobDescription!.replace(/"""/g, "'''") : null

    const jdSection = safeJd
      ? `\nJob Description (weight question categories toward the candidate's identified gaps):\n"""\n${safeJd}\n"""\n`
      : ''

    const categoryInstruction = hasJd
      ? "Choose 4–5 categories most relevant to the candidate's stack AND the JD gaps."
      : "Choose 4–5 categories most relevant to the candidate's stack and strong zones."

    return `Generate a structured interview question set for this software engineering candidate.

Candidate Profile:
${profileSummary}
${jdSection}
Instructions:
- ${categoryInstruction}
- For each category produce exactly 5 beginner, 5 intermediate, and 5 expert questions.
- Every question must have two parts:
    concept     — a theory or knowledge-check question (e.g. "What is X?" or "What are the trade-offs of Y?")
    application — an implementation or debugging follow-up (e.g. "How would you implement X?" or "How would you fix Y?")
- Set "asked" to false for every question.
- Valid category values: dsa, system-design, language-specific, framework-specific, database, devops, behavioral, general.

Return a JSON object with exactly this shape:
${QUESTIONS_SCHEMA}

Return ONLY the JSON. No explanation, no markdown.`
  }

  // ─── Response parser ────────────────────────────────────────────────────────

  private parseQuestions(raw: string): InterviewQuestions {
    let parsed: unknown
    try {
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

    if (!this.isValidQuestions(parsed)) {
      throw new UnprocessableEntityException(
        'Claude returned an incomplete question set. Please try again.',
      )
    }

    return parsed as InterviewQuestions
  }

  // Basic shape check — full structural validation (5 per tier, required fields)
  // is added in Step 3.
  private isValidQuestions(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false
    const q = value as Record<string, unknown>
    return Array.isArray(q['categories']) && q['categories'].length > 0
  }

  // Exposed for use by the full validator in Step 3
  protected isValidCategory(value: unknown): value is CategoryGroup {
    if (typeof value !== 'object' || value === null) return false
    const c = value as Record<string, unknown>
    return (
      typeof c['category'] === 'string' &&
      VALID_CATEGORIES.includes(c['category'] as (typeof VALID_CATEGORIES)[number]) &&
      Array.isArray(c['beginner']) &&
      Array.isArray(c['intermediate']) &&
      Array.isArray(c['expert'])
    )
  }
}
