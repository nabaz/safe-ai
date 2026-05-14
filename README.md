# KidAI Playground

Safe AI for children, managed by parents.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + **Prisma** ORM
- **NextAuth.js** (parent auth) + custom JWT (child sessions)
- **OpenAI GPT-4o** with streaming
- **OpenAI Moderation API** + custom keyword filter
- **Turborepo** monorepo

## Quick start

### 1. Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Docker (for PostgreSQL)
- OpenAI API key

### 2. Clone and install

```bash
git clone <repo>
cd safe-ai
pnpm install
pnpm approve-builds --all
```

### 3. Environment

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kidai_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
CHILD_SESSION_SECRET="$(openssl rand -base64 32)"
OPENAI_API_KEY="sk-..."
```

### 4. Start the database

```bash
docker compose up -d
```

### 5. Run migrations

```bash
pnpm --filter @kidai/db db:migrate
```

(First time: type a migration name like `init` when prompted.)

> **Note:** The migrate script automatically runs `prisma generate` after migrating to keep
> the Prisma client in sync. If you ever see `Cannot read properties of undefined` errors
> on a Prisma model, run `pnpm --filter @kidai/db db:generate` manually.

### 6. Start the dev server

```bash
pnpm dev
```

App runs at http://localhost:3000

---

## How it works

### User flows

**Parent signup:**  
`/signup` → COPPA consent → create account → add child profiles → get PIN

**Child login:**  
`/child` → enter Profile ID + PIN → age-themed chat UI

**Safety pipeline** (every message):  
Input → keyword filter → OpenAI moderation → GPT-4o → output PII scan → OpenAI moderation → delivered

### Age tiers

| Tier | Ages | Persona | Topics |
|------|------|---------|--------|
| Explorer | 4–7 | Pip the fox | Animals, nature, stories, counting, colours |
| Builder | 8–11 | Max the inventor | + Science, history, geography, coding, creative writing |
| Creator | 12–15 | Nova the mentor | + Current events, debate, advanced STEM |

### Packages

```
packages/
├── shared/      Types, constants, utilities (AGE_TIER_CONFIGS, etc.)
├── db/          Prisma schema + client singleton
├── ai/          OpenAI client, age-tier system prompts, streaming chat
└── moderation/  Input/output safety pipeline
```

### Key API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `POST /api/auth/signup` | Public | Parent registration + COPPA consent |
| `POST /api/children` | Parent | Create child profile, returns plain PIN once |
| `PATCH /api/children/[id]` | Parent | Update controls (pause, limits, blackout) |
| `PUT /api/children/[id]/topics` | Parent | Toggle topic restrictions |
| `POST /api/child-session` | Public | Child PIN login → sets HttpOnly cookie |
| `POST /api/chat` | Child session | Streaming chat with full safety pipeline |
| `GET /api/conversations` | Parent | View child's conversation history |
| `GET /api/alerts` | Parent | Flagged events feed |

---

## Compliance

- **COPPA**: Consent timestamp + IP captured at signup. No data collection from children without parent consent. Right to deletion (cascade delete child profile).
- **No ads**: Zero tracking pixels, no behavioural advertising.
- **Transparency**: Children are always shown "You're talking to an AI. Your parent can see this chat."
- **Data minimisation**: Children store display name, DOB (for tier calculation), and conversation content only.

## Deployment

### Vercel (frontend)

```bash
vercel deploy
```

Set env vars in Vercel dashboard. Point `DATABASE_URL` to Railway PostgreSQL.

### Railway (PostgreSQL)

1. Create a PostgreSQL service on Railway
2. Copy the connection string to `DATABASE_URL`
3. Run `pnpm --filter @kidai/db db:migrate` against production DB
