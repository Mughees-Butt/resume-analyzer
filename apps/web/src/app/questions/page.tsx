import { QuestionsPanel } from '@/components/resume/questions-panel'

export default function QuestionsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Interview Questions
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Tiered questions tailored to the candidate — check them off as you go.
        </p>
      </header>

      <main className="w-full max-w-3xl">
        <QuestionsPanel />
      </main>
    </div>
  )
}
