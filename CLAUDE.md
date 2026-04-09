# Resume Analyzer — Claude Context

## What this project is

A web platform that ingests a candidate's resume (PDF upload or pasted text), extracts a
structured skill profile, generates tiered interview questions (beginner / intermediate / expert),
and produces a tailored take-home test project. Phase 1 focuses on Computer Science candidates.

## Monorepo layout

```
apps/
  api/   NestJS 11 — REST API (port 4000)
  web/   Next.js 16 App Router — frontend (port 3000)
packages/
  shared/  Shared TypeScript types (no runtime code yet)
infrastructure/
  docker-compose.yml  PostgreSQL 16 + Redis 7 for local dev
```

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | NestJS 11, Multer (memory storage), pdf-parse v1.1.1 |
| AI | Anthropic Claude SDK (Phase 2+) |
| DB | PostgreSQL 16 + Prisma ORM (Phase 5+) |
| Queue | Redis 7 + BullMQ (Phase 7+) |
| Package manager | pnpm 10 + Turborepo |
| Language | TypeScript throughout (strict) |

## Commands

```bash
# Install
pnpm install

# Dev servers
pnpm --filter api start:dev   # NestJS on :4000
pnpm --filter web dev         # Next.js on :3000

# Type-check
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit

# Lint
pnpm --filter api lint
pnpm --filter web lint

# Build
pnpm --filter web build
```

## Architecture decisions

- **pdf-parse pinned to v1.1.1** — v2 exports a class instead of a function; manual type
  declaration lives at `apps/api/src/types/pdf-parse.d.ts`.
- **Multer memory storage** — PDF bytes stay in memory (Buffer), never written to disk.
  5 MB file-size limit enforced at the interceptor level.
- **Text cleaning pipeline** — shared `cleanText()` private method in `ResumeService` is
  applied to both PDF-extracted text and pasted text so the AI always receives consistent input.
- **API client** — `apps/web/src/lib/api-client.ts` is the single place all fetch calls live;
  components never call `fetch` directly.
- **Tabs layout fix** — shadcn Tabs root uses `data-horizontal:flex-col` which requires a
  `data-horizontal` boolean attribute; the component sets `data-orientation="horizontal"` instead,
  so we override with `className="flex-col"` directly.

## Code style

- TypeScript strict mode, no `any`
- NestJS: one module per feature (`modules/resume/`), DTOs validated with class-validator
- React: `'use client'` only where state/events are needed; server components by default
- Commits follow Conventional Commits: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
- Branch strategy: `main` → `dev` → `feature/*`

## Current phase status

| Phase | Description | Status |
|---|---|---|
| 0 | Monorepo scaffold, CI/CD, Docker | ✅ Complete |
| 1 | Resume ingestion (PDF + text, API + UI) | ✅ Complete |
| 2 | AI analysis — skill profile + interview questions | 🔜 Next |
| 3+ | Auth, persistence, queue, multi-org | 🔜 Future |

## PR review guidelines

- Check that `ResumeService` methods throw typed NestJS exceptions (`BadRequestException`,
  `UnprocessableEntityException`) — never raw `Error`.
- Client-side validation in `DropZone` and `TextPaste` must mirror the API guards (PDF MIME,
  5 MB limit, 50-char minimum).
- No `any` types. No direct `fetch` calls outside `api-client.ts`.
- All new React components that use state or browser APIs must have `'use client'` at the top.
- Ensure new API routes follow the `/api/<resource>/<action>` convention and are registered
  in the feature module.
