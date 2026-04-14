import { InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { QuestionsService } from './questions.service'

// Module-level mock — must be named with "mock" prefix so Jest's hoisting
// allows the variable to be referenced inside the jest.mock() factory.
const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}))

// ─── Fixture helpers ─────────────────────────────────────────────────────────

const makeQuestion = (type: 'standard' | 'structural' = 'standard') => ({
  concept: 'What is X?',
  application: 'How would you implement X?',
  topic: 'Topic Label',
  hint: 'A strong answer should mention Y and Z.',
  type,
  asked: false,
})

const makeStandardTier = () => Array.from({ length: 5 }, () => makeQuestion('standard'))

const makeExpertTier = () => [
  ...Array.from({ length: 4 }, () => makeQuestion('standard')),
  makeQuestion('structural'),
]

const VALID_QUESTIONS = {
  tiers: {
    beginner: makeStandardTier(),
    intermediate: makeStandardTier(),
    expert: makeExpertTier(),
  },
}

const VALID_PROFILE = {
  name: 'Jane Doe',
  yearsOfExperience: 6,
  experienceLevel: 'senior' as const,
  specialization: 'backend' as const,
  primaryStack: {
    languages: ['TypeScript'],
    frameworks: ['NestJS'],
    tools: ['Docker'],
    cloud: ['AWS'],
    databases: ['PostgreSQL'],
    other: [],
  },
  secondaryStack: { languages: [], frameworks: [], tools: [], cloud: [], databases: [], other: [] },
  strongZones: ['API Design'],
}

function claudeReturns(value: unknown) {
  mockMessagesCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(value) }],
  })
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('QuestionsService', () => {
  let service: QuestionsService

  beforeAll(() => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key-for-unit-tests'
  })

  afterAll(() => {
    delete process.env['ANTHROPIC_API_KEY']
  })

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [QuestionsService],
    }).compile()

    service = module.get(QuestionsService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── Mode 1 — profile only ────────────────────────────────────────────────

  describe('Mode 1 (profile only)', () => {
    it('returns InterviewQuestions when Claude responds with valid JSON', async () => {
      claudeReturns(VALID_QUESTIONS)

      const result = await service.generateQuestions(VALID_PROFILE)

      expect(result.tiers.beginner).toHaveLength(5)
      expect(result.tiers.intermediate).toHaveLength(5)
      expect(result.tiers.expert).toHaveLength(5)
    })

    it('strips markdown fences when Claude wraps the JSON in a code block', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '```json\n' + JSON.stringify(VALID_QUESTIONS) + '\n```' }],
      })

      const result = await service.generateQuestions(VALID_PROFILE)
      expect(result.tiers.beginner).toHaveLength(5)
    })
  })

  // ─── Mode 2 — profile + JD ───────────────────────────────────────────────

  describe('Mode 2 (profile + JD)', () => {
    it('returns InterviewQuestions when a job description is provided', async () => {
      claudeReturns(VALID_QUESTIONS)

      const result = await service.generateQuestions(
        VALID_PROFILE,
        'We need a TypeScript backend engineer with AWS experience.',
      )

      expect(result.tiers.expert).toHaveLength(5)
    })
  })

  // ─── Missing API key ──────────────────────────────────────────────────────

  describe('missing API key', () => {
    let keylessService: QuestionsService

    beforeEach(async () => {
      delete process.env['ANTHROPIC_API_KEY']
      const module = await Test.createTestingModule({
        providers: [QuestionsService],
      }).compile()
      keylessService = module.get(QuestionsService)
    })

    afterEach(() => {
      process.env['ANTHROPIC_API_KEY'] = 'test-key-for-unit-tests'
    })

    it('throws InternalServerErrorException when ANTHROPIC_API_KEY is not set', async () => {
      await expect(keylessService.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  // ─── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws InternalServerErrorException when the Anthropic API call throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('network timeout'))

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        InternalServerErrorException,
      )
    })

    it('throws UnprocessableEntityException when Claude returns unparseable text', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'not valid json at all' }],
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })

  // ─── Structural validator ─────────────────────────────────────────────────

  describe('structural validator', () => {
    it('throws UnprocessableEntityException when tiers is missing', async () => {
      claudeReturns({ something: 'else' })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when a tier has the wrong question count', async () => {
      claudeReturns({
        tiers: {
          beginner: Array.from({ length: 4 }, () => makeQuestion()), // 4 instead of 5
          intermediate: makeStandardTier(),
          expert: makeExpertTier(),
        },
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when expert tier has no structural question', async () => {
      claudeReturns({
        tiers: {
          beginner: makeStandardTier(),
          intermediate: makeStandardTier(),
          expert: makeStandardTier(), // all 5 standard — missing structural
        },
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when expert tier has two structural questions', async () => {
      claudeReturns({
        tiers: {
          beginner: makeStandardTier(),
          intermediate: makeStandardTier(),
          expert: [
            ...Array.from({ length: 3 }, () => makeQuestion('standard')),
            makeQuestion('structural'),
            makeQuestion('structural'), // two structural
          ],
        },
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when a question has a whitespace-only concept', async () => {
      const badQuestion = { ...makeQuestion(), concept: '   ' }
      claudeReturns({
        tiers: {
          beginner: [badQuestion, ...Array.from({ length: 4 }, () => makeQuestion())],
          intermediate: makeStandardTier(),
          expert: makeExpertTier(),
        },
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when a question is missing a hint', async () => {
      const noHint = {
        concept: 'What is X?',
        application: 'How?',
        topic: 'Topic',
        type: 'standard' as const,
        asked: false,
      }
      claudeReturns({
        tiers: {
          beginner: [noHint, ...Array.from({ length: 4 }, () => makeQuestion())],
          intermediate: makeStandardTier(),
          expert: makeExpertTier(),
        },
      })

      await expect(service.generateQuestions(VALID_PROFILE)).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })

  describe('buildTierCalibration fallback', () => {
    it('logs a warning and still returns 15 valid questions for an unknown experienceLevel', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
      claudeReturns(VALID_QUESTIONS)

      const unknownLevelProfile = { ...VALID_PROFILE, experienceLevel: 'staff' }
      const result = await service.generateQuestions(unknownLevelProfile as typeof VALID_PROFILE)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown experienceLevel "staff"'),
      )
      const allQuestions = [
        ...result.tiers.beginner,
        ...result.tiers.intermediate,
        ...result.tiers.expert,
      ]
      expect(allQuestions).toHaveLength(15)

      warnSpy.mockRestore()
    })
  })
})
