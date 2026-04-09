import { UnprocessableEntityException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ResumeService } from './resume.service'

// Mock pdf-parse so tests don't require real PDF buffers
jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: jest.fn(),
}))

import pdfParse from 'pdf-parse'
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>

describe('ResumeService', () => {
  let service: ResumeService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ResumeService],
    }).compile()

    service = module.get(ResumeService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ─── normaliseText ────────────────────────────────────────────────────────

  describe('normaliseText', () => {
    it('returns cleaned text for valid input', () => {
      const input = 'A'.repeat(60)
      const result = service.normaliseText(input)
      expect(result.text).toBe(input)
    })

    it('throws when text is shorter than 50 characters', () => {
      expect(() => service.normaliseText('short text')).toThrow(UnprocessableEntityException)
    })

    it('throws when text is only whitespace', () => {
      expect(() => service.normaliseText('   '.repeat(20))).toThrow(UnprocessableEntityException)
    })

    it('strips leading and trailing whitespace', () => {
      const input = '  ' + 'A'.repeat(60) + '  '
      const result = service.normaliseText(input)
      expect(result.text).toBe('A'.repeat(60))
    })

    it('collapses multiple blank lines', () => {
      const input = 'A'.repeat(30) + '\n\n\n\n' + 'B'.repeat(30)
      const result = service.normaliseText(input)
      expect(result.text).not.toMatch(/\n{3,}/)
    })
  })

  // ─── extractFromPdf ───────────────────────────────────────────────────────

  describe('extractFromPdf', () => {
    it('returns extracted text and metadata for a valid PDF buffer', async () => {
      mockPdfParse.mockResolvedValueOnce({
        text: 'A'.repeat(60),
        numpages: 2,
        info: {},
        version: '1.10.100',
      })

      const result = await service.extractFromPdf(Buffer.from('fake'), 'resume.pdf')

      expect(result.text).toBe('A'.repeat(60))
      expect(result.pageCount).toBe(2)
      expect(result.fileName).toBe('resume.pdf')
    })

    it('throws UnprocessableEntityException when pdf-parse throws', async () => {
      mockPdfParse.mockRejectedValueOnce(new Error('corrupted'))

      await expect(service.extractFromPdf(Buffer.from('bad'), 'bad.pdf')).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws when extracted text is too short', async () => {
      mockPdfParse.mockResolvedValueOnce({
        text: 'too short',
        numpages: 1,
        info: {},
        version: '1.10.100',
      })

      await expect(service.extractFromPdf(Buffer.from('fake'), 'scan.pdf')).rejects.toThrow(
        UnprocessableEntityException,
      )
    })

    it('throws when extracted text is empty', async () => {
      mockPdfParse.mockResolvedValueOnce({
        text: '',
        numpages: 1,
        info: {},
        version: '1.10.100',
      })

      await expect(service.extractFromPdf(Buffer.from('fake'), 'empty.pdf')).rejects.toThrow(
        UnprocessableEntityException,
      )
    })
  })
})
