import type { CandidateProfile } from '@resume-analyzer/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface UploadResult {
  success: boolean
  source: 'pdf' | 'text'
  text: string
  fileName?: string
  pageCount?: number
}

export interface AnalyseResult {
  success: boolean
  mode: 'resume-only' | 'jd'
  profile: CandidateProfile
}

// ── Helper ────────────────────────────────────────────────────────────────────

function extractMessage(err: unknown, fallback: string): string {
  const raw = (err as { message?: string | string[] }).message
  return (Array.isArray(raw) ? raw.join('. ') : raw) ?? fallback
}

// ── Resume ingestion (Phase 1) ────────────────────────────────────────────────

// Send a PDF file to the API and get back extracted text
export async function uploadResumePdf(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_URL}/api/resume/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(extractMessage(err, 'Upload failed'))
  }

  return res.json() as Promise<UploadResult>
}

// Send pasted text to the API and get back cleaned text
export async function submitResumeText(text: string): Promise<UploadResult> {
  const res = await fetch(`${API_URL}/api/resume/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(extractMessage(err, 'Submission failed'))
  }

  return res.json() as Promise<UploadResult>
}

// ── Analysis (Phase 2) ────────────────────────────────────────────────────────

// Send extracted resume text + optional JD to Claude for analysis.
// Mode 1 (no JD): returns structured candidate profile.
// Mode 2 (with JD): returns profile + fit/gap analysis.
export async function analyseResume(
  resumeText: string,
  jobDescription?: string,
): Promise<AnalyseResult> {
  const res = await fetch(`${API_URL}/api/resume/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescription }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(extractMessage(err, 'Analysis failed'))
  }

  return res.json() as Promise<AnalyseResult>
}
