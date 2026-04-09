'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface DropZoneProps {
  // Called with the selected File once the user picks or drops a PDF
  onFile: (file: File) => void
  // When true the zone is locked — a request is already in flight
  disabled?: boolean
}

export function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Validate the file is a PDF and hand it up to the parent
  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (file.type !== 'application/pdf') {
        setError('Only PDF files are accepted. Please select a .pdf file.')
        return
      }

      // 5 MB client-side guard — matches the API limit
      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Maximum size is 5 MB.')
        return
      }

      onFile(file)
    },
    [onFile],
  )

  // ── Drag events ────────────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear when leaving the zone entirely, not a child element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile],
  )

  // ── File input change ──────────────────────────────────────────

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset so the same file can be re-selected after an error
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Drop target */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop a PDF here or click to browse"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            inputRef.current?.click()
          }
        }}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors',
          isDragging
            ? 'border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800'
            : 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800',
        ].join(' ')}
      >
        {/* Upload icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-zinc-400 dark:text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Drag &amp; drop your resume here
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            PDF only · max 5 MB
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={(e) => {
            // Prevent the outer div onClick from firing twice
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          Browse file
        </Button>
      </div>

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
      />

      {/* Inline validation error */}
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
