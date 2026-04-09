const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface UploadResult {
  success: boolean
  source: 'pdf' | 'text'
  text: string
  fileName?: string
  pageCount?: number
}

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
    throw new Error((err as { message?: string }).message ?? 'Upload failed')
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
    throw new Error((err as { message?: string }).message ?? 'Submission failed')
  }

  return res.json() as Promise<UploadResult>
}
