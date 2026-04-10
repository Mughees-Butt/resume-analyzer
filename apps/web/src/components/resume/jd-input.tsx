'use client'

import { Textarea } from '@/components/ui/textarea'

interface JdInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function JdInput({ value, onChange, disabled = false }: JdInputProps) {
  const charCount = value.trim().length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Job Description
        </p>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          Optional
        </span>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Adding a JD enables fit analysis — aligned skills, gaps, and a role-specific
        assessment alongside the candidate profile.
      </p>

      <Textarea
        placeholder="Paste the job description here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-52 resize-none overflow-y-auto font-mono text-sm leading-relaxed"
        aria-label="Job description"
      />

      {charCount > 0 && (
        <p className="text-right text-xs text-zinc-500 dark:text-zinc-400">
          {charCount.toLocaleString()} characters
        </p>
      )}
    </div>
  )
}
