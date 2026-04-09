import { InternalServerErrorException, UnprocessableEntityException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AnalysisService } from './analysis.service'

// Module-level mock — must be named with "mock" prefix so Jest's hoisting
// allows the variable to be referenced inside the jest.mock() factory.
const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}))

// ─── Fixture data ────────────────────────────────────────────────────────────

const VALID_PROFILE = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  currentRole: 'Senior Software Engineer',
  yearsOfExperience: 7,
  experienceLevel: 'senior',
  specialization: 'backend',
  primaryStack: {
    languages: ['TypeScript'],
    frameworks: ['NestJS'],
    tools: ['Docker'],
    cloud: ['AWS'],
    databases: ['PostgreSQL'],
    other: [],
  },
  secondaryStack: {
    languages: [],
    frameworks: ['React'],
    tools: [],
    cloud: [],
    databases: [],
    other: [],
  },
  strongZones: ['API Design', 'System Architecture'],
}

const VALID_FIT = {
  ...VALID_PROFILE,
  fitAnalysis: {
    alignedSkills: ['TypeScript', 'NestJS'],
    gaps: ['Kubernetes'],
    summary: 'Strong backend match. Missing DevOps tooling.',
  },
}

function claudeReturns(value: unknown) {
  mockMessagesCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text: JSON.stringify(value) }],
  })
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('AnalysisService', () => {
  let service: AnalysisService

  beforeAll(() => {
    // Satisfy the lazy getter — no real call is made because mockMessagesCreate
    // intercepts it before it reaches the Anthropic network layer.
    process.env['ANTHROPIC_API_KEY'] = 'test-key-for-unit-tests'
  })

  afterAll(() => {
    delete process.env['ANTHROPIC_API_KEY']
  })

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AnalysisService],
    }).compile()

    service = module.get(AnalysisService)
  })

  afterEach(() => jest.clearAllMocks())

  // ─── Mode 1 — resume only ─────────────────────────────────────────────────

  describe('Mode 1 (resume only)', () => {
    it('returns a CandidateProfile when Claude responds with valid JSON', async () => {
      claudeReturns(VALID_PROFILE)

      const result = await service.analyseResume('A'.repeat(200))

      expect(result.name).toBe('Jane Doe')
      expect(result.experienceLevel).toBe('senior')
      expect(result.fitAnalysis).toBeUndefined()
    })

    it('strips markdown fences when Claude wraps the JSON in a code block', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '```json\n' + JSON.stringify(VALID_PROFILE) + '\n```' }],
      })

      const result = await service.analyseResume('A'.repeat(200))
      expect(result.name).toBe('Jane Doe')
    })
  })

  // ─── Mode 2 — resume + JD ─────────────────────────────────────────────────

  describe('Mode 2 (resume + JD)', () => {
    it('returns a profile with fitAnalysis when a JD is provided', async () => {
      claudeReturns(VALID_FIT)

      const result = await service.analyseResume('A'.repeat(200), 'We need a backend engineer')

      expect(result.fitAnalysis).toBeDefined()
      expect(result.fitAnalysis?.alignedSkills).toContain('TypeScript')
      expect(result.fitAnalysis?.gaps).toContain('Kubernetes')
    })

    it('throws UnprocessableEntityException when fitAnalysis is absent in JD mode', async () => {
      claudeReturns(VALID_PROFILE) // valid profile but no fitAnalysis

      await expect(
        service.analyseResume('A'.repeat(200), 'Some job description text'),
      ).rejects.toThrow(UnprocessableEntityException)
    })
  })

  // ─── Error handling ───────────────────────────────────────────────────────

  describe('error handling', () => {
    it('throws InternalServerErrorException when the Anthropic API call throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('network timeout'))

      await expect(service.analyseResume('A'.repeat(200))).rejects.toThrow(
        InternalServerErrorException,
      )
    })

    it('throws UnprocessableEntityException when Claude returns unparseable text', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'not valid json at all' }],
      })

      await expect(service.analyseResume('A'.repeat(200))).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws UnprocessableEntityException when required profile fields are missing', async () => {
      claudeReturns({ name: 'Incomplete Profile' }) // missing all required numeric/array fields

      await expect(service.analyseResume('A'.repeat(200))).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })
})
