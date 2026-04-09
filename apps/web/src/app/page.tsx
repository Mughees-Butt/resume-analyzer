import { ResumeUploader } from '@/components/resume/resume-uploader'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      {/* Page header */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Resume Analyzer
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Upload a resume → get a skill profile, interview questions &amp; a take-home project
        </p>
      </header>

      {/* Main upload widget */}
      <main className="w-full max-w-2xl">
        <ResumeUploader />
      </main>
    </div>
  )
}
