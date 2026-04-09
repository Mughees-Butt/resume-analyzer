import type { CandidateProfile, TechStack } from '@resume-analyzer/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ProfileCardProps {
  profile: CandidateProfile
  mode: 'resume-only' | 'jd'
  onReset: () => void
}

const LEVEL_LABELS: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid-level',
  senior: 'Senior',
  lead: 'Lead / Principal',
}

const LEVEL_COLOURS: Record<string, string> = {
  junior: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  mid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  senior: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

const SPEC_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Full-stack',
  mobile: 'Mobile',
  devops: 'DevOps',
  ml: 'ML / AI',
  data: 'Data',
  unknown: 'General',
}

function StackGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Badge key={`${item}-${i}`} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function StackSection({ title, stack }: { title: string; stack: TechStack }) {
  const hasContent = Object.values(stack).some((arr) => arr.length > 0)
  if (!hasContent) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</p>
      <StackGroup label="Languages" items={stack.languages} />
      <StackGroup label="Frameworks" items={stack.frameworks} />
      <StackGroup label="Databases" items={stack.databases} />
      <StackGroup label="Cloud" items={stack.cloud} />
      <StackGroup label="Tools" items={stack.tools} />
      <StackGroup label="Other" items={stack.other} />
    </div>
  )
}

export function ProfileCard({ profile, mode, onReset }: ProfileCardProps) {
  const levelColour = LEVEL_COLOURS[profile.experienceLevel] ?? LEVEL_COLOURS['mid']
  const levelLabel = LEVEL_LABELS[profile.experienceLevel] ?? profile.experienceLevel
  const specLabel = SPEC_LABELS[profile.specialization] ?? profile.specialization

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl">{profile.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            {profile.currentRole && <span>{profile.currentRole}</span>}
            {profile.email && (
              <>
                {profile.currentRole && <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                <span>{profile.email}</span>
              </>
            )}
          </CardDescription>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={[
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              levelColour,
            ].join(' ')}
          >
            {levelLabel}
          </span>
          <Badge variant="outline" className="text-xs">
            {specLabel}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {profile.yearsOfExperience}y exp
          </Badge>
          <Badge
            variant="outline"
            className="text-xs text-zinc-400 dark:text-zinc-500"
          >
            {mode === 'jd' ? 'Resume + JD' : 'Resume only'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Strong zones */}
        {profile.strongZones.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Strong zones
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.strongZones.map((zone, i) => (
                <span
                  key={`${zone}-${i}`}
                  className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tech stacks */}
        <StackSection title="Primary stack" stack={profile.primaryStack} />
        <StackSection title="Secondary stack" stack={profile.secondaryStack} />

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Education</p>
            {profile.education.map((ed, i) => (
              <p key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
                {ed.degree} — {ed.institution}
                {ed.year ? ` (${ed.year})` : ''}
              </p>
            ))}
          </div>
        )}

        {/* Reset */}
        <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Start over
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
