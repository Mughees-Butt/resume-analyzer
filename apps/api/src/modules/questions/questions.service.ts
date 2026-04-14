import {
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common'
import Anthropic from '@anthropic-ai/sdk'
import type { CandidateProfile, InterviewQuestions } from '@resume-analyzer/shared'

const MODEL = 'claude-sonnet-4-6'

// Schema constants — flat tier structure (15 questions total)
const STANDARD_QUESTION = `{
        "concept": "string — theory/knowledge-check (e.g. \\"What is X?\\" or \\"What are the trade-offs of Y?\\")",
        "application": "string — implementation/fix follow-up (e.g. \\"How would you implement X?\\" or \\"How would you debug Y?\\")",
        "topic": "string — specific topic label (e.g. \\"React hooks\\", \\"SQL joins\\")",
        "hint": "string — 1-2 sentences: key points a strong answer must mention (interviewer-only, not shown to candidate)",
        "type": "standard",
        "asked": false
      }`

const STRUCTURAL_QUESTION = `{
        "concept": "string — design/flow thinking question tied to the candidate's actual experience (e.g. \\"Based on your work with X, how would you design the data models for Y?\\")",
        "application": "string — follow-up on trade-offs and scale (e.g. \\"What trade-offs did you consider? What would you change if load requirements doubled?\\")",
        "topic": "string — topic label (e.g. \\"Data Model Design\\", \\"Service Flow Architecture\\")",
        "hint": "string — specific signals to listen for: what a strong answer from this candidate should articulate given their background (interviewer-only)",
        "type": "structural",
        "asked": false
      }`

const QUESTIONS_SCHEMA = `{
  "tiers": {
    "beginner": [${STANDARD_QUESTION}, "...5 total — all type: standard"],
    "intermediate": [${STANDARD_QUESTION}, "...5 total — all type: standard"],
    "expert": [${STANDARD_QUESTION}, "...4 type: standard, then:", ${STRUCTURAL_QUESTION}]
  }
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
        max_tokens: 4096,
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
      ? `\nJob Description (weight topics toward the candidate's identified gaps):\n"""\n${safeJd}\n"""\n`
      : ''

    const topicInstruction = hasJd
      ? "Choose topics spanning the candidate's primary stack AND the JD gaps."
      : "Choose topics spanning the candidate's primary stack and strong zones."

    const tierCalibration = this.buildTierCalibration(profile.experienceLevel)

    return `Generate a focused 15-question interview set for this software engineering candidate.

Candidate Profile:
${profileSummary}
${jdSection}
Tier difficulty calibration (IMPORTANT — tiers are relative to this candidate's level, not universal):
${tierCalibration}

Instructions:
- Total: exactly 15 questions — 5 beginner, 5 intermediate, 5 expert.
- ${topicInstruction}
- Spread topics across the candidate's stack — do not repeat the same topic across tiers.
- Every question has two parts:
    concept     — theory or knowledge-check (e.g. "What is X?" or "What are the trade-offs of Y?")
    application — implementation or debugging follow-up (e.g. "How would you implement X?" or "How would you fix Y?")
- Every question must include a hint (interviewer-only, never shown to the candidate):
    standard questions:   1-2 sentences covering the key points a strong answer must mention.
    structural questions: specific signals to listen for — what this candidate should articulate given their background.
- beginner tier:     all 5 questions must have type "standard".
- intermediate tier: all 5 questions must have type "standard".
- expert tier:       exactly 4 questions type "standard", exactly 1 question type "structural".
- The structural question must be personalised to this candidate's actual experience:
    - Reference a specific technology, pattern, or project domain from their profile.
    - Ask them to walk through data model design, service flow, or architecture decisions.
    - concept: a design/flow thinking question (e.g. "Based on your work with NestJS, how would you design the data models for a multi-tenant billing system?")
    - application: trade-off and scale follow-up (e.g. "What trade-offs did you consider? How would your design change if the system needed to handle 10× the load?")
- Set "asked" to false for every question.

Return a JSON object with exactly this shape:
${QUESTIONS_SCHEMA}

Return ONLY the JSON. No explanation, no markdown.`
  }

  private buildTierCalibration(level: string): string {
    const map: Record<string, string> = {
      junior:
        '- beginner:     core language/framework syntax they must know to do their job\n' +
        '- intermediate: applying those fundamentals to solve a real task (error handling, testing, state management)\n' +
        '- expert:       design thinking stretch questions — trade-offs, patterns, basic architecture',
      mid:
        '- beginner:     solid working knowledge they use daily (tooling, patterns, data structures)\n' +
        '- intermediate: system design basics, performance trade-offs, debugging at depth\n' +
        '- expert:       distributed systems concepts, architecture decisions, cross-team impact',
      senior:
        '- beginner:     things a senior must know cold — SOLID principles, concurrency basics, distributed primitives\n' +
        '- intermediate: applied system design, scalability patterns, testing strategy at scale\n' +
        '- expert:       complex distributed systems, multi-tenant or high-load architecture, cross-cutting concerns',
      lead:
        '- beginner:     deep technical baselines expected of the whole team they lead\n' +
        '- intermediate: org-level design decisions, API contracts, delivery trade-offs, incident response\n' +
        '- expert:       platform thinking, evolutionary architecture, engineering culture and process',
    }
    return map[level] ?? map['senior']
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

  // ─── Validators ─────────────────────────────────────────────────────────────

  // Full structural validator:
  //   - tiers object with beginner, intermediate, expert arrays
  //   - Each tier has exactly 5 questions
  //   - beginner + intermediate: all type 'standard'
  //   - expert: exactly 4 'standard' + 1 'structural'
  //   - Every question has non-empty concept, application, topic + boolean asked
  private isValidQuestions(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false
    const q = value as Record<string, unknown>

    if (typeof q['tiers'] !== 'object' || q['tiers'] === null) return false
    const tiers = q['tiers'] as Record<string, unknown>

    const beginner = tiers['beginner']
    const intermediate = tiers['intermediate']
    const expert = tiers['expert']

    if (!Array.isArray(beginner) || beginner.length !== 5) return false
    if (!Array.isArray(intermediate) || intermediate.length !== 5) return false
    if (!Array.isArray(expert) || expert.length !== 5) return false

    const allStandard = (arr: unknown[]) =>
      arr.every(
        (q) => this.isValidQuestion(q) && (q as Record<string, unknown>)['type'] === 'standard',
      )

    if (!allStandard(beginner as unknown[])) return false
    if (!allStandard(intermediate as unknown[])) return false

    // Expert: exactly 4 standard + 1 structural
    const expertQuestions = expert as unknown[]
    if (!expertQuestions.every((q) => this.isValidQuestion(q))) return false

    const structuralCount = expertQuestions.filter(
      (q) => (q as Record<string, unknown>)['type'] === 'structural',
    ).length
    const standardCount = expertQuestions.filter(
      (q) => (q as Record<string, unknown>)['type'] === 'standard',
    ).length

    return structuralCount === 1 && standardCount === 4
  }

  private isValidQuestion(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false
    const q = value as Record<string, unknown>
    return (
      typeof q['concept'] === 'string' &&
      q['concept'].trim().length > 0 &&
      typeof q['application'] === 'string' &&
      q['application'].trim().length > 0 &&
      typeof q['topic'] === 'string' &&
      q['topic'].trim().length > 0 &&
      typeof q['hint'] === 'string' &&
      q['hint'].trim().length > 0 &&
      (q['type'] === 'standard' || q['type'] === 'structural') &&
      typeof q['asked'] === 'boolean'
    )
  }
}
