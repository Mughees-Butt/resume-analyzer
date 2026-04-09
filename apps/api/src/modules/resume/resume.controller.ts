import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ResumeService } from './resume.service'
import { AnalysisService } from './analysis.service'
import { ResumeTextDto } from './dto/resume-text.dto'
import { AnalyseResumeDto } from './dto/analyse-resume.dto'

// All routes in this controller are prefixed with /api/resume
// (the /api global prefix is set in main.ts)
@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly analysisService: AnalysisService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // POST /api/resume/upload
  // Accepts a PDF file via multipart form upload.
  // Field name must be 'file'.
  // Returns the extracted plain text and page count.
  // ─────────────────────────────────────────────────────────────
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep file in memory, not on disk
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
      },
      fileFilter: (_req, file, callback) => {
        // Silently reject non-PDFs — the null-file check below throws the
        // proper NestJS exception through the exception filter pipeline.
        callback(null, file.mimetype === 'application/pdf')
      },
    }),
  )
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Only PDF files are accepted. Please upload a valid PDF.')
    }

    const result = await this.resumeService.extractFromPdf(file.buffer, file.originalname)

    return {
      success: true,
      source: 'pdf',
      fileName: result.fileName,
      pageCount: result.pageCount,
      text: result.text,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/resume/text
  // Accepts raw resume text pasted directly.
  // Body must be JSON: { "text": "..." }
  // Returns the cleaned plain text.
  // ─────────────────────────────────────────────────────────────
  @Post('text')
  submitText(@Body() dto: ResumeTextDto) {
    const result = this.resumeService.normaliseText(dto.text)

    return {
      success: true,
      source: 'text',
      text: result.text,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/resume/analyse
  // Accepts extracted resume text + optional job description.
  // Mode 1 (resume only): returns structured CandidateProfile.
  // Mode 2 (resume + JD): returns profile + fitAnalysis.
  // ─────────────────────────────────────────────────────────────
  @Post('analyse')
  async analyseResume(@Body() dto: AnalyseResumeDto) {
    const profile = await this.analysisService.analyseResume(dto.resumeText, dto.jobDescription)

    return {
      success: true,
      mode: dto.jobDescription?.trim() ? 'jd' : 'resume-only',
      profile,
    }
  }
}
