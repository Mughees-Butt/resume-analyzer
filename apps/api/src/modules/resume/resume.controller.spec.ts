import { Test, TestingModule } from '@nestjs/testing'
import { ValidationPipe, INestApplication } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest')
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'
import { AnalysisService } from './analysis.service'

const mockResumeService = {
  extractFromPdf: jest.fn(),
  normaliseText: jest.fn(),
}

const mockAnalysisService = {
  analyseResume: jest.fn(),
}

describe('ResumeController (integration)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [
        { provide: ResumeService, useValue: mockResumeService },
        { provide: AnalysisService, useValue: mockAnalysisService },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await app.close()
  })

  // ─── POST /resume/upload ──────────────────────────────────────────────────

  describe('POST /resume/upload', () => {
    it('returns 400 when no file is provided', async () => {
      await request(app.getHttpServer()).post('/resume/upload').expect(400)
    })

    it('returns 400 when a non-PDF file is uploaded', async () => {
      await request(app.getHttpServer())
        .post('/resume/upload')
        .attach('file', Buffer.from('not a pdf'), {
          filename: 'resume.txt',
          contentType: 'text/plain',
        })
        .expect(400)
    })

    it('returns 200 with extracted data when a valid PDF is uploaded', async () => {
      mockResumeService.extractFromPdf.mockResolvedValueOnce({
        text: 'Extracted resume text',
        pageCount: 1,
        fileName: 'resume.pdf',
      })

      const res = await request(app.getHttpServer())
        .post('/resume/upload')
        .attach('file', Buffer.from('%PDF-fake'), {
          filename: 'resume.pdf',
          contentType: 'application/pdf',
        })
        .expect(201)

      expect(res.body).toMatchObject({
        success: true,
        source: 'pdf',
        fileName: 'resume.pdf',
        pageCount: 1,
        text: 'Extracted resume text',
      })
    })

    it('returns 413 when the file exceeds 5 MB', async () => {
      const oversized = Buffer.alloc(6 * 1024 * 1024, 0)
      await request(app.getHttpServer())
        .post('/resume/upload')
        .attach('file', oversized, {
          filename: 'big.pdf',
          contentType: 'application/pdf',
        })
        .expect(413)
    })
  })

  // ─── POST /resume/text ────────────────────────────────────────────────────

  describe('POST /resume/text', () => {
    it('returns 400 when body is missing', async () => {
      await request(app.getHttpServer())
        .post('/resume/text')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400)
    })

    it('returns 400 when text is not a string', async () => {
      await request(app.getHttpServer()).post('/resume/text').send({ text: 12345 }).expect(400)
    })

    it('returns 400 when text is an empty string', async () => {
      await request(app.getHttpServer()).post('/resume/text').send({ text: '' }).expect(400)
    })

    it('returns 200 with cleaned text for valid input', async () => {
      mockResumeService.normaliseText.mockReturnValueOnce({
        text: 'Cleaned resume text',
      })

      const res = await request(app.getHttpServer())
        .post('/resume/text')
        .send({ text: 'A valid resume body with enough content' })
        .expect(201)

      expect(res.body).toMatchObject({
        success: true,
        source: 'text',
        text: 'Cleaned resume text',
      })
    })

    it('strips unknown fields from the request body (whitelist: true)', async () => {
      mockResumeService.normaliseText.mockReturnValueOnce({ text: 'ok' })

      await request(app.getHttpServer())
        .post('/resume/text')
        .send({ text: 'A valid resume body with enough content', injected: 'evil' })
        .expect(201)

      // The service should only have received the whitelisted DTO
      expect(mockResumeService.normaliseText).toHaveBeenCalledWith(
        'A valid resume body with enough content',
      )
    })
  })

  // ─── POST /resume/analyse ─────────────────────────────────────────────────

  describe('POST /resume/analyse', () => {
    const LONG_RESUME = 'A'.repeat(200)

    const MOCK_PROFILE = {
      name: 'Jane Doe',
      email: null,
      currentRole: 'Senior Engineer',
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
        frameworks: [],
        tools: [],
        cloud: [],
        databases: [],
        other: [],
      },
      strongZones: ['API Design'],
    }

    it('returns 400 when resumeText is too short (< 50 chars)', async () => {
      await request(app.getHttpServer())
        .post('/resume/analyse')
        .send({ resumeText: 'too short' })
        .expect(400)
    })

    it('returns 201 with mode resume-only when no JD is provided', async () => {
      mockAnalysisService.analyseResume.mockResolvedValueOnce(MOCK_PROFILE)

      const res = await request(app.getHttpServer())
        .post('/resume/analyse')
        .send({ resumeText: LONG_RESUME })
        .expect(201)

      expect(res.body).toMatchObject({ success: true, mode: 'resume-only' })
      expect((res.body as { profile: { name: string } }).profile.name).toBe('Jane Doe')
    })

    it('returns 201 with mode jd when a job description is provided', async () => {
      const profileWithFit = {
        ...MOCK_PROFILE,
        fitAnalysis: {
          alignedSkills: ['TypeScript'],
          gaps: ['Kubernetes'],
          summary: 'Good match overall.',
        },
      }
      mockAnalysisService.analyseResume.mockResolvedValueOnce(profileWithFit)

      const res = await request(app.getHttpServer())
        .post('/resume/analyse')
        .send({ resumeText: LONG_RESUME, jobDescription: 'We need a TypeScript engineer.' })
        .expect(201)

      expect(res.body).toMatchObject({ success: true, mode: 'jd' })
      expect((res.body as { profile: { fitAnalysis: unknown } }).profile.fitAnalysis).toBeDefined()
    })

    it('returns 500 when AnalysisService throws', async () => {
      mockAnalysisService.analyseResume.mockRejectedValueOnce(
        new Error('The analysis service is temporarily unavailable. Please try again.'),
      )

      await request(app.getHttpServer())
        .post('/resume/analyse')
        .send({ resumeText: LONG_RESUME })
        .expect(500)
    })
  })
})
