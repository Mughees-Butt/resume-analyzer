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
import { ResumeTextDto } from './dto/resume-text.dto'

// All routes in this controller are prefixed with /api/resume
// (the /api global prefix is set in main.ts)
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

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
        // Reject anything that isn't a PDF before it reaches the service
        if (file.mimetype !== 'application/pdf') {
          callback(new BadRequestException('Only PDF files are accepted'), false)
        } else {
          callback(null, true)
        }
      },
    }),
  )
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided. Please upload a PDF.')
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
    if (!dto.text) {
      throw new BadRequestException('No text provided. Please paste your resume content.')
    }

    const result = this.resumeService.normaliseText(dto.text)

    return {
      success: true,
      source: 'text',
      text: result.text,
    }
  }
}
