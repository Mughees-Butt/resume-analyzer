'use client'

import { createContext, useContext, useState } from 'react'
import type { CandidateProfile } from '@resume-analyzer/shared'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnalysisState {
  profile: CandidateProfile
  mode: 'resume-only' | 'jd'
  // Carried forward for Phase 7 transcription cross-referencing
  resumeText: string
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
