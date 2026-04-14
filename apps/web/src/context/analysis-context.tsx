'use client'

import { createContext, useContext, useState } from 'react'
import type { CandidateProfile } from '@resume-analyzer/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisState {
  profile: CandidateProfile
  mode: 'resume-only' | 'jd'
  // Stored for Phase 7 transcription cross-referencing. Not currently read by
  // QuestionsPanel — forward-looking state, not wired to anything today.
  resumeText: string
  // Carried forward so the questions call receives full JD context (not just gaps)
  jobDescription?: string
}

interface AnalysisContextValue {
  state: AnalysisState | null
  setAnalysis: (state: AnalysisState) => void
  clearAnalysis: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalysisState | null>(null)

  return (
    <AnalysisContext.Provider
      value={{
        state,
        setAnalysis: setState,
        clearAnalysis: () => setState(null),
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext)
  if (!ctx) {
    throw new Error('useAnalysis must be used within an AnalysisProvider')
  }
  return ctx
}

// Note: AnalysisContext is in-memory React state — it does not survive a hard
// page refresh. Navigating directly to /questions after a refresh will find an
// empty context and the redirect guard will send the user back to /. This is
// intentional; persistence is deferred to Phase 5 (DB-backed session storage).

