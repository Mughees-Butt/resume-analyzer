'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropZone } from './drop-zone'
import { TextPaste } from './text-paste'
import { uploadResumePdf, submitResumeText, type UploadResult } from '@/lib/api-client'

// ─── State machine ────────────────────────────────────────────────────────────
type Status = 'idle' | 'loading' | 'success' | 'error'

export function ResumeUploader() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isLoading = status === 'loading'

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    setStatus('loading')
    setResult(null)
    setErrorMsg(null)

    try {
      const data = await uploadResumePdf(file)
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('error')
    }
  }

  async function handleText(text: string) {
    setStatus('loading')
    setResult(null)
    setErrorMsg(null)

    try {
      const data = await submitResumeText(text)
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed. Please try again.')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Input card — hidden once a result is shown */}
      {status !== 'success' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Upload your resume</CardTitle>
            <CardDescription>
              Drop a PDF or paste the text directly. We&apos;ll extract the content and
              generate a structured skill profile with interview questions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* force flex-col — the shadcn Tabs root defaults to flex-row
                when the data-horizontal variant doesn't resolve correctly */}
            <Tabs defaultValue="pdf" className="flex-col gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="pdf" className="flex-1">
                  PDF upload
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1">
                  Paste text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pdf">
                <DropZone onFile={handleFile} disabled={isLoading} />
              </TabsContent>

              <TabsContent value="text">
                <TextPaste onText={handleText} disabled={isLoading} />
              </TabsContent>
            </Tabs>

            {/* Loading state */}
            {isLoading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Extracting resume content…
              </div>
            )}

            {/* Error state */}
            {status === 'error' && errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
              >
                {errorMsg}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result card */}
      {status === 'success' && result && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Resume extracted</CardTitle>
              <CardDescription>
                {result.fileName
                  ? `${result.fileName}${result.pageCount ? ` · ${result.pageCount} page${result.pageCount > 1 ? 's' : ''}` : ''}`
                  : 'Pasted text'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {result.source === 'pdf' ? 'PDF' : 'Text'}
              </Badge>
              <button
                onClick={reset}
                className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                Start over
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Extracted text preview — fixed height, scrolls internally */}
            <pre className="h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {result.text}
            </pre>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {result.text.length.toLocaleString()} characters extracted.{' '}
              AI analysis coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
