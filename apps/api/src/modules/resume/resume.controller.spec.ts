import { Test, TestingModule } from '@nestjs/testing'
import { ValidationPipe, INestApplication } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest')
import { ResumeController } from './resume.controller'
import { ResumeService } from './resume.service'

const mockResumeService = {
  extractFromPdf: jest.fn(),
  normaliseText: jest.fn(),
}

describe('ResumeController (integration)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeController],
      providers: [{ provide: ResumeService, useValue: mockResumeService }],
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
})
