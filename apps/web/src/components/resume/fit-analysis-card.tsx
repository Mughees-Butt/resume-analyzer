import type { FitAnalysis } from '@resume-analyzer/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FitAnalysisCardProps {
  fit: FitAnalysis
}

export function FitAnalysisCard({ fit }: FitAnalysisCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Role fit analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Fit summary */}
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {fit.summary}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Aligned skills */}
          {fit.alignedSkills.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Aligned skills
              </p>
              <ul className="flex flex-col gap-1">
                {fit.alignedSkills.map((skill) => (
                  <li key={skill} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="text-emerald-500" aria-hidden="true">✓</span>
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {fit.gaps.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Gaps / missing
              </p>
              <ul className="flex flex-col gap-1">
                {fit.gaps.map((gap) => (
                  <li key={gap} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="text-amber-500" aria-hidden="true">⚠</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
