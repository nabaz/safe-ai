# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**KidAI Playground** — a safe AI playground and coding tutor for children (ages 4–15), with full parental controls. Two primary product surfaces:

1. **Chat** — age-tier-gated conversational AI (Pip / Max / Nova personas).
2. **Code Lab** — Python lessons, daily challenges, quizzes, XP/points system.

Everything is built around three age tiers — `EXPLORER` (4–7), `BUILDER` (8–11), `CREATOR` (12–15) — defined in `packages/shared/src/constants.ts` (`AGE_TIER_CONFIGS`). Most user-facing behavior (allowed topics, vocabulary, response length, lessons) is keyed on the tier, so when adding features, always thread the tier through.

## Commands

All commands run from the repo root via Turborepo + pnpm (workspace package manager is `pnpm@11`).

```bash
pnpm install                                  # install workspace deps
pnpm approve-builds --all                     # required first time (Prisma, sharp, esbuild)
pnpm dev                                      # turbo dev --filter=@kidai/web — http://localhost:3000
pnpm build                                    # turbo build (all packages)
pnpm lint                                     # turbo lint (next lint inside web)
pnpm format                                   # prettier --write **/*.{ts,tsx,md,json}

# Database (Postgres via docker compose up -d)
pnpm --filter @kidai/db db:migrate            # prisma migrate dev + generate (auto)
pnpm --filter @kidai/db db:generate           # regenerate client only
pnpm --filter @kidai/db db:push               # push schema without migration (dev only)
pnpm --filter @kidai/db db:seed               # seed sample data
pnpm db:studio                                # Prisma Studio GUI
```

The `db:migrate` script **already runs `prisma generate` after migrating**. If you see `Cannot read properties of undefined` on a Prisma model, the client is out of sync — run `db:generate`.

There is currently **no test suite** in the repo. Don't claim work is verified by tests; verify by running the dev server and exercising the flow.

## Architecture

### Monorepo layout

```
apps/web/              Next.js 16 (App Router, React 19, Tailwind v4)
packages/shared/       Types, AGE_TIER_CONFIGS, TopicCategory enum, utils
packages/db/           Prisma schema + singleton client (@kidai/db)
packages/ai/           Provider-agnostic chat (Groq | OpenAI), age-tier system prompts
packages/moderation/   Input/output safety pipeline
```

Internal packages export from `./src/index.ts` directly — no build step. Import as `@kidai/shared`, `@kidai/db`, `@kidai/ai`, `@kidai/moderation`.

### Two parallel auth systems (important)

- **Parents** use **NextAuth** (credentials provider, JWT sessions). All `/parent/*` routes and most `/api/*` routes require this.
- **Children** use a **custom JWT in an HttpOnly cookie** (`CHILD_SESSION_SECRET`). They never touch NextAuth. Helpers live in `apps/web/src/lib/session.ts`.

The middleware at `apps/web/src/proxy.ts` is the gatekeeper. It runs NextAuth's `withAuth`, but **explicitly bypasses** `/child/*` and the child-facing API routes (`/api/chat`, `/api/child-session`, `/api/daily-challenges`, `/api/code-lab`, `/api/points`) because those do their own session checks. **When you add a new child-facing API route, you must add it to the allowlist in `proxy.ts` or fetches will get redirected to the parent sign-in page.**

Note: the middleware file is named `proxy.ts`, not the conventional `middleware.ts`. Don't rename it without checking how Next.js is configured to pick it up.

### Safety pipeline (chat)

Every chat message goes through: **keyword filter → OpenAI Moderation → AI provider → output PII scan → OpenAI Moderation → stream to child**. Live in `packages/moderation/`. Flagged events create rows in `Alert` (visible to parent) and persist on the `Message` row (`inputFlagged`, `outputFlagged`, `flagReason`, `moderationScore`). Never short-circuit this pipeline — it's the entire compliance story.

### AI providers

`packages/ai/src/client.ts` picks between **Groq** (preferred when `GROQ_API_KEY` is set — fast + free for dev) and **OpenAI**. `AI_PROVIDER=openai` forces OpenAI. Both use the OpenAI-compatible streaming format, so `streamChat` is provider-agnostic. **OpenAI is always used for the Moderation API** regardless of the chat provider.

System prompts in `packages/ai/src/prompts.ts` are built from `AGE_TIER_CONFIGS[tier]` — persona, allowed topics, vocab level, max length. Don't hardcode persona/topic text in route handlers; extend the tier config instead.

### Code Lab

The Python tutor is **not** a real Python runtime. `apps/web/src/components/child/code-lab/python-runner.ts` **transpiles a Python subset to JS** and runs it in a sandboxed `new Function(...)` scope with whitelisted builtins (`print`, `len`, `str`, `int`, `float`, `round`, `range`, `abs`, `max`, `min`, `sum`). Lessons must stay within this subset. If you add a builtin, add it both to the `Function` arg list and to the transpiler.

Lesson content is **static data** in `apps/web/src/components/child/code-lab/curriculum.ts` — array of `Lesson` objects, each with a `checkOutput(output: string) => boolean` validator. Each lesson's `id` is what gets stored in the `CodeLessonProgress` and `DailyCodeSession.lessonIds` rows, so **never rename a lesson id once it's shipped** — it will orphan progress records.

`daily-engine.ts` picks the 5 lessons for the day; `daily-quiz.tsx` runs the end-of-day quiz; `xp-bar.tsx` / `xp-toast.tsx` show the points system. Points are an event log (`PointsLedger` with a `PointsReason` enum) — never mutate a running total; always insert a new ledger row via `apps/web/src/lib/points.ts`.

### Database conventions

- Singleton Prisma client exported from `@kidai/db` — never `new PrismaClient()` in app code.
- Every child-owned model has `onDelete: Cascade` from `ChildProfile` so a deletion request (COPPA) wipes everything in one call.
- Dates that represent "a day" (`DailyUsageLog.date`, `DailyCodeSession.date`, `DailyChallenge.date`) are stored as **midnight UTC** — always normalize before querying.
- Unique constraints: `(childId, date)` on daily tables, `(childId, lessonId)` on lesson progress. Use `upsert`, not `findFirst → create`.

### Compliance constraints (not optional)

- **COPPA**: parent consent (`consentGiven`, `consentGivenAt`, `consentIpAddress`) must be recorded at signup; deletion must cascade. No third-party trackers, no behavioral ads.
- **Transparency banner**: children must see "You're talking to an AI. Your parent can see this chat." Don't remove it.
- **Data minimisation**: store only display name, DOB (for tier calc), conversation content, and progress. Don't add demographic, location, or device fields without explicit reason.

## Style

- Prettier config: no semicolons, single quotes, 2-space indent, trailing commas `es5`, print width 100.
- TypeScript everywhere; `zod` is used at API route boundaries for input validation.
