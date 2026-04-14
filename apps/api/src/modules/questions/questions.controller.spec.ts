import { Test, TestingModule } from '@nestjs/testing'
import { ValidationPipe, INestApplication } from '@nestjs/common'
import { Server } from 'http'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest')
import { QuestionsController } from './questions.controller'
import { QuestionsService } from './questions.service'

const mockQuestionsService = {
  generateQuestions: jest.fn(),
}

// Minimal valid CandidateProfile object — passes @IsObject() on the DTO
const MOCK_PROFILE = {
  name: 'Jane Doe',
  yearsOfExperience: 6,
  experienceLevel: 'senior',
  specialization: 'backend',
  primaryStack: {
    languages: ['TypeScript'],
    frameworks: ['NestJS'],
    tools: [],
    cloud: [],
    databases: ['PostgreSQL'],
    other: [],
  },
  secondaryStack: { languages: [], frameworks: [], tools: [], cloud: [], databases: [], other: [] },
  strongZones: ['API Design'],
}

const MOCK_QUESTIONS = {
  tiers: {
    beginner: Array.from({ length: 5 }, (_, i) => ({
      concept: `Beginner concept ${i}`,
      application: `Beginner application ${i}`,
      topic: 'Topic',
      hint: 'Key points to listen for.',
      type: 'standard',
      asked: false,
    })),
    intermediate: Array.from({ length: 5 }, (_, i) => ({
      concept: `Intermediate concept ${i}`,
      application: `Intermediate application ${i}`,
      topic: 'Topic',
      hint: 'Key points to listen for.',
      type: 'standard',
      asked: false,
    })),
    expert: [
      ...Array.from({ length: 4 }, (_, i) => ({
        concept: `Expert concept ${i}`,
        application: `Expert application ${i}`,
        topic: 'Topic',
        hint: 'Key points to listen for.',
        type: 'standard',
        asked: false,
      })),
      {
        concept: 'Structural concept',
        application: 'Structural application',
        topic: 'Architecture',
        hint: 'Listen for: specific design decisions tied to their experience.',
        type: 'structural',
        asked: false,
      },
    ],
  },
}

describe('QuestionsController (integration)', () => {
  let app: INestApplication
  let server: Server

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [{ provide: QuestionsService, useValue: mockQuestionsService }],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    server = app.getHttpServer() as Server
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await app.close()
  })

  // ─── POST /questions/generate ─────────────────────────────────────────────

  describe('POST /questions/generate', () => {
    it('returns 400 when profile is missing', async () => {
      await request(server).post('/questions/generate').send({}).expect(400)
    })

    it('returns 400 when profile is not an object', async () => {
      await request(server)
        .post('/questions/generate')
        .send({ profile: 'not-an-object' })
        .expect(400)
    })

    it('returns 400 when jobDescription is present but under 20 chars', async () => {
      await request(server)
        .post('/questions/generate')
        .send({ profile: MOCK_PROFILE, jobDescription: 'too short' })
        .expect(400)
    })

    it('returns 201 with mode resume-only when no JD is provided', async () => {
      mockQuestionsService.generateQuestions.mockResolvedValueOnce(MOCK_QUESTIONS)

      const res = await request(server)
        .post('/questions/generate')
        .send({ profile: MOCK_PROFILE })
        .expect(201)

      expect(res.body as { success: boolean }).toMatchObject({ success: true, mode: 'resume-only' })
      expect(
        (res.body as { questions: typeof MOCK_QUESTIONS }).questions.tiers.beginner,
      ).toHaveLength(5)
    })

    it('returns 201 with mode jd when a job description is provided', async () => {
      mockQuestionsService.generateQuestions.mockResolvedValueOnce(MOCK_QUESTIONS)

      const res = await request(server)
        .post('/questions/generate')
        .send({
          profile: MOCK_PROFILE,
          jobDescription: 'We need a TypeScript backend engineer.',
        })
        .expect(201)

      expect(res.body as { mode: string }).toMatchObject({ success: true, mode: 'jd' })
    })

    it('returns 500 when QuestionsService throws', async () => {
      mockQuestionsService.generateQuestions.mockRejectedValueOnce(
        new Error('The question generation service is temporarily unavailable. Please try again.'),
      )

      await request(server).post('/questions/generate').send({ profile: MOCK_PROFILE }).expect(500)
    })
  })
})
