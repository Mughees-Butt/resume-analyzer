'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { DropZone } from './drop-zone'
import { JdInput } from './jd-input'
import { ProfileCard } from './profile-card'
import { FitAnalysisCard } from './fit-analysis-card'
import { uploadResumePdf, submitResumeText, analyseResume } from '@/lib/api-client'
import type { AnalyseResult } from '@/lib/api-client'
import { useAnalysis } from '@/context/analysis-context'
import { useRouter } from 'next/navigation'

// ─── State machine ────────────────────────────────────────────────────────────
// idle     → user is setting up inputs
// loading  → extraction + analysis in flight
// analysed → profile is ready to display
// error    → something went wrong, form stays visible
type Status = 'idle' | 'loading' | 'analysed' | 'error'

// Minimum chars for pasted resume text (mirrors the API guard)
const MIN_RESUME_LENGTH = 50

export function ResumeUploader() {
  const { setAnalysis, clearAnalysis } = useAnalysis()
  const router = useRouter()

  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<AnalyseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Resume input — either a staged File (PDF tab) or raw text (paste tab)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeText, setResumeText] = useState('')
  const [activeTab, setActiveTab] = useState<'pdf' | 'text'>('pdf')

  // Job description — always optional
  const [jdText, setJdText] = useState('')

  const isLoading = status === 'loading'

  // Resume is ready when a file is staged OR enough text is pasted
  const resumeReady =
    activeTab === 'pdf'
      ? resumeFile !== null
      : resumeText.trim().length >= MIN_RESUME_LENGTH

  // Mode updates dynamically as JD is filled in
  const mode: 'resume-only' | 'jd' = jdText.trim().length > 0 ? 'jd' : 'resume-only'

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Called by DropZone when a valid PDF is selected — stages without submitting
  function handleFileStaged(file: File) {
    setResumeFile(file)
    setErrorMsg(null)
  }

  // Single submit — chains extraction (PDF path) + analysis
  async function handleAnalyse() {
    if (!resumeReady || isLoading) return
    setStatus('loading')
    setErrorMsg(null)
    setResult(null)

    try {
      let extractedText: string

      if (activeTab === 'pdf') {
        const extracted = await uploadResumePdf(resumeFile!)
        extractedText = extracted.text
      } else {
        const cleaned = await submitResumeText(resumeText)
        extractedText = cleaned.text
      }

      const data = await analyseResume(extractedText, jdText.trim() || undefined)
      setResult(data)
      setAnalysis({
        profile: data.profile,
        mode: data.mode,
        resumeText: extractedText,
        jobDescription: jdText.trim() || undefined,
      })
      setStatus('analysed')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setResult(null)
    setErrorMsg(null)
    setResumeFile(null)
    setResumeText('')
    setJdText('')
    setActiveTab('pdf')
    clearAnalysis()
  }

  // ── Render: analysed state ────────────────────────────────────────────────

  if (status === 'analysed' && result) {
    return (
      <div className="w-full max-w-3xl space-y-4">
        <ProfileCard profile={result.profile} mode={result.mode} onReset={reset} />
        {result.profile.fitAnalysis && (
          <FitAnalysisCard fit={result.profile.fitAnalysis} />
        )}
        {/* Continue CTA */}
        <div className="flex justify-end">
          <Button type="button" onClick={() => router.push('/questions')}>
            Continue to questions →
          </Button>
        </div>
      </div>
    )
  }

  // ── Render: input / loading / error states ────────────────────────────────

  return (
    <div className="w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Analyse a resume</CardTitle>
          <CardDescription>
            Upload or paste a resume. Optionally add a job description for role-specific
            fit analysis and targeted questions.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Two-column input area */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* LEFT — Resume input */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Resume</p>
              <Tabs
                defaultValue="pdf"
                className="flex-col gap-3"
                onValueChange={(v) => {
                  setActiveTab(v as 'pdf' | 'text')
                  setErrorMsg(null)
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="pdf" className="flex-1">PDF upload</TabsTrigger>
                  <TabsTrigger value="text" className="flex-1">Paste text</TabsTrigger>
                </TabsList>

                <TabsContent value="pdf">
                  <DropZone onFile={handleFileStaged} disabled={isLoading} />
                  {resumeFile && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <span aria-hidden="true">✓</span>
                      {resumeFile.name}
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="text">
                  <Textarea
                    placeholder="Paste resume text here…"
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value)
                      if (errorMsg) setErrorMsg(null)
                    }}
                    disabled={isLoading}
                    className="h-52 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
                    aria-label="Resume text"
                  />
                  {resumeText.trim().length > 0 && (
                    <p
                      className={[
                        'mt-1.5 text-right text-xs',
                        resumeText.trim().length < MIN_RESUME_LENGTH
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-500 dark:text-zinc-400',
                      ].join(' ')}
                    >
                      {resumeText.trim().length.toLocaleString()} chars
                      {resumeText.trim().length < MIN_RESUME_LENGTH &&
                        ` — need at least ${MIN_RESUME_LENGTH}`}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* RIGHT — Job Description input */}
            <JdInput value={jdText} onChange={setJdText} disabled={isLoading} />
          </div>

          {/* Error banner */}
          {status === 'error' && errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            >
              {errorMsg}
            </div>
          )}

          {/* Mode indicator + Analyse button */}
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                mode === 'jd'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
              ].join(' ')}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  mode === 'jd' ? 'bg-violet-500' : 'bg-zinc-400',
                ].join(' ')}
                aria-hidden="true"
              />
              {mode === 'jd' ? 'Resume + Job Description' : 'Resume only'}
            </span>

            <Button
              type="button"
              disabled={!resumeReady || isLoading}
              onClick={() => void handleAnalyse()}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Analysing…
                </span>
              ) : (
                'Analyse resume →'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
