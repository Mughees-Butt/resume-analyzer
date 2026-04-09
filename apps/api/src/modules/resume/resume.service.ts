import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import pdfParse from 'pdf-parse'

// Minimum character threshold for a resume to be considered valid.
// Applied to both PDF-extracted text and pasted text.
const MIN_RESUME_LENGTH = 50

export interface ExtractedResume {
  // The cleaned plain text content of the resume
  text: string
  // Number of pages in the original PDF (undefined for pasted text)
  pageCount?: number
  // Original file name if uploaded as PDF (undefined for pasted text)
  fileName?: string
}

@Injectable()
export class ResumeService {
  // ─────────────────────────────────────────────────────────────
  // PDF extraction
  // Receives the raw file buffer from the controller and returns
  // clean plain text. Throws if the PDF has no extractable text
  // (e.g. scanned image PDFs).
  // ─────────────────────────────────────────────────────────────
  async extractFromPdf(buffer: Buffer, fileName: string): Promise<ExtractedResume> {
    let parsed: Awaited<ReturnType<typeof pdfParse>>

    try {
      parsed = await pdfParse(buffer)
    } catch {
      throw new UnprocessableEntityException(
        'Could not read this PDF. The file may be corrupted or password-protected.',
      )
    }

    if (!parsed.text || parsed.text.trim().length < MIN_RESUME_LENGTH) {
      throw new UnprocessableEntityException(
        'No readable text found in this PDF. ' +
          'The file may be a scanned image. Please paste the resume text instead.',
      )
    }

    return {
      text: this.cleanText(parsed.text),
      pageCount: parsed.numpages,
      fileName,
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Text paste normalisation
  // Receives raw pasted text from the controller and returns a
  // cleaned version. Same cleaning pipeline used for both paths
  // so analysis always receives consistent input.
  // ─────────────────────────────────────────────────────────────
  normaliseText(rawText: string): ExtractedResume {
    if (!rawText || rawText.trim().length < MIN_RESUME_LENGTH) {
      throw new UnprocessableEntityException(
        'The pasted text is too short to be a valid resume. ' +
          'Please paste the full resume content.',
      )
    }

    return {
      text: this.cleanText(rawText),
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Shared text cleaning pipeline
  // Applied to both PDF-extracted text and raw pasted text.
  // Produces consistent plain text for the AI analysis phase.
  // ─────────────────────────────────────────────────────────────
  private cleanText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n') // normalise Windows line endings
      .replace(/\r/g, '\n') // normalise old Mac line endings
      .replace(/\n{3,}/g, '\n\n') // collapse 3+ blank lines into 2
      .replace(/[ \t]+/g, ' ') // collapse multiple spaces and tabs
      .replace(/^\s+|\s+$/gm, '') // trim whitespace from each line
      .trim() // trim the whole document
  }
}
