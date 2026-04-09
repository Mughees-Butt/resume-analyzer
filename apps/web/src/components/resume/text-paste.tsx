'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface TextPasteProps {
  // Called with the trimmed text once the user submits
  onText: (text: string) => void
  // When true the form is locked — a request is already in flight
  disabled?: boolean
}

// Minimum character count to be considered a plausible resume
// (matches the API's normaliseText guard)
const MIN_LENGTH = 50

export function TextPaste({ onText, disabled = false }: TextPasteProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const charCount = value.trim().length
  const isTooShort = charCount > 0 && charCount < MIN_LENGTH
  const isEmpty = charCount === 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isEmpty) {
      setError('Please paste your resume content before submitting.')
      return
    }

    if (isTooShort) {
      setError(`Too short — paste the full resume (at least ${MIN_LENGTH} characters).`)
      return
    }

    onText(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        placeholder="Paste your resume text here…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          // Clear any previous submission error while the user is typing
          if (error) setError(null)
        }}
        disabled={disabled}
        // Fixed viewport height — scrolls internally so the page never grows
        className="h-52 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
        aria-label="Resume text"
        aria-invalid={!!error}
        aria-describedby={error ? 'paste-error' : undefined}
      />

      {/* Character counter — visible once typing starts */}
      {charCount > 0 && (
        <p
          className={[
            'text-right text-xs',
            isTooShort
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-zinc-500 dark:text-zinc-400',
          ].join(' ')}
        >
          {charCount.toLocaleString()} characters
          {isTooShort && ` — need at least ${MIN_LENGTH}`}
        </p>
      )}

      {/* Inline validation error */}
      {error && (
        <p id="paste-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={disabled || isEmpty}
        className="self-end"
      >
        {disabled ? 'Analysing…' : 'Analyse resume'}
      </Button>
    </form>
  )
}
