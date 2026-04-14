'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterviewQuestion, InterviewQuestions } from '@resume-analyzer/shared'
import { useAnalysis } from '@/context/analysis-context'
import { generateQuestions } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── State machine ────────────────────────────────────────────────────────────
// idle    → profile loaded, waiting for user to trigger generation
// loading → API call in flight
// ready   → questions displayed, user checking them off
// error   → generation failed
type Status = 'idle' | 'loading' | 'ready' | 'error'

type Tier = 'beginner' | 'intermediate' | 'expert'

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuestionRow({
  question,
  index,
  onToggle,
}: {
  question: InterviewQuestion
  index: number
  onToggle: () => void
}) {
  const [hintOpen, setHintOpen] = useState(false)

  return (
    <li
      className={[
        'flex items-start gap-3 rounded-lg border p-4 transition-colors',
        question.asked
          ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-900'
          : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800',
      ].join(' ')}
    >
      {/* Checkbox */}
      <input
        id={`q-${question.topic.replace(/\s+/g, '-').toLowerCase()}-${index}`}
        type="checkbox"
        checked={question.asked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-violet-600"
        aria-label={`Mark "${question.concept}" as asked`}
      />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Header row: topic badge + structural badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
            {question.topic}
          </span>
          {question.type === 'structural' && (
            <Badge variant="secondary" className="text-xs">
              Structural
            </Badge>
          )}
        </div>

        {/* Concept */}
        <p
          className={[
            'text-sm font-medium leading-snug',
            question.asked
              ? 'text-zinc-400 line-through dark:text-zinc-500'
              : 'text-zinc-800 dark:text-zinc-100',
          ].join(' ')}
        >
          {question.concept}
        </p>

        {/* Application follow-up */}
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-600 dark:text-zinc-300">Follow-up: </span>
          {question.application}
        </p>

        {/* Hint — collapsed by default */}
        <div>
          <button
            type="button"
            onClick={() => setHintOpen((o) => !o)}
            className="text-xs text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
            aria-expanded={hintOpen}
          >
            {hintOpen ? 'Hide hint' : 'Show hint'}
          </button>
          {hintOpen && (
            <p className="mt-1.5 rounded-md bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-800 dark:bg-violet-950 dark:text-violet-300">
              <span className="font-semibold">Hint: </span>
              {question.hint}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

function TierSection({
  title,
  questions,
  tier,
  onToggle,
}: {
  title: string
  questions: InterviewQuestion[]
  tier: Tier
  onToggle: (tier: Tier, index: number) => void
}) {
  const asked = questions.filter((q) => q.asked).length

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h2>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {asked}/{questions.length} asked
        </span>
      </div>
      <ol className="flex flex-col gap-2 list-none">
        {questions.map((q, i) => (
          <QuestionRow
            key={`${tier}-${i}`}
            question={q}
            index={i}
            onToggle={() => onToggle(tier, i)}
          />
        ))}
      </ol>
    </section>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function QuestionsPanel() {
  const router = useRouter()
  const { state } = useAnalysis()

  const [status, setStatus] = useState<Status>('idle')
  const [questions, setQuestions] = useState<InterviewQuestions | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect guard — if someone navigates directly to /questions without context
  useEffect(() => {
    if (!state) {
      router.replace('/')
    }
  }, [state, router])

  if (!state) return null

  // Destructure after null guard so TypeScript narrows cleanly inside closures
  const { profile, mode, jobDescription } = state

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setStatus('loading')
    setErrorMsg(null)

    try {
      const result = await generateQuestions(profile, jobDescription)
      setQuestions(result.questions)
      setStatus('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Question generation failed. Please try again.')
      setStatus('error')
    }
  }

  function toggleAsked(tier: Tier, index: number) {
    setQuestions((prev) => {
      if (!prev) return prev
      const updatedTier = prev.tiers[tier].map((q, i) =>
        i === index ? { ...q, asked: !q.asked } : q,
      )
      return { ...prev, tiers: { ...prev.tiers, [tier]: updatedTier } }
    })
  }

  const totalAsked = questions
    ? Object.values(questions.tiers).flat().filter((q) => q.asked).length
    : 0
  const totalQuestions = questions ? Object.values(questions.tiers).flat().length : 0

  // ── Render: ready state ──────────────────────────────────────────────────────

  if (status === 'ready' && questions) {
    return (
      <div className="w-full space-y-8">
        {/* Progress summary */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {totalAsked} of {totalQuestions} questions asked
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {mode === 'jd' ? 'Tailored to job description' : 'Based on resume profile'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              ← New analysis
            </button>
          </div>
        </div>

        <TierSection
          title="Beginner"
          questions={questions.tiers.beginner}
          tier="beginner"
          onToggle={toggleAsked}
        />
        <TierSection
          title="Intermediate"
          questions={questions.tiers.intermediate}
          tier="intermediate"
          onToggle={toggleAsked}
        />
        <TierSection
          title="Expert"
          questions={questions.tiers.expert}
          tier="expert"
          onToggle={toggleAsked}
        />
      </div>
    )
  }

  // ── Render: idle / loading / error states ────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Generate interview questions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Candidate summary */}
        <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {profile.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {profile.experienceLevel} · {profile.specialization}
            {mode === 'jd' && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden="true" />
                JD provided
              </span>
            )}
          </p>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Claude will generate 15 tiered questions (5 beginner, 5 intermediate, 5 expert)
          personalised to this candidate
          {mode === 'jd' ? ' and the provided job description' : ''}.
          Each question has a concept part and an application follow-up.
        </p>

        {/* Error banner */}
        {status === 'error' && errorMsg && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          >
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            ← New analysis
          </button>

          <Button
            type="button"
            disabled={status === 'loading'}
            onClick={() => void handleGenerate()}
          >
            {status === 'loading' ? (
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
                Generating…
              </span>
            ) : (
              'Generate questions →'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
