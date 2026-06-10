# ColdPilot — Project Handoff & Context

This file lets any new session (or a fresh Claude Code chat) resume work without
re-deriving the project. Read it first.

## What ColdPilot is

A product that builds targeted databases of businesses on demand (starting with
**B2B SaaS**, US market) enriched with **phone numbers**, then **cold-calls** them
with an **AI voice agent** (GPT-4o + ElevenLabs + telephony) that pitches a
monthly subscription. Recursive model: we use ColdPilot to sell ColdPilot to B2B
SaaS companies, who then point it at their own prospect lists.

## Tech stack

Full-stack Bun monorepo bootstrapped from the `di-sukharev/vibe` template:
- `backend/` — Bun + Hono + Prisma + PostgreSQL 18, custom JWT auth, Zod + OpenAPI.
- `webapp/` — React + Vite + TanStack Query/Router/Form (CSR, behind login).
- `website/` — Astro (public SEO pages) — deferred, untouched.
- `packages/contracts/` — shared Zod schemas (`@coldpilot/contracts`).
- `mobile/` — pointer to the Expo `mobile` branch — deferred.

## What is already built (validated: typecheck clean, 81 unit/contract tests pass)

- **Domain models** (`backend/prisma/schema.prisma`): `LeadList`, `Lead`, `Call`
  + enums (`LeadListStatus`, `LeadStatus`, `CallStatus`, `CallOutcome`). Migration
  in `backend/prisma/migrations/20260610120000_add_leads_and_calls/`.
- **Contracts** (`packages/contracts/src/leads.ts`): lists, leads, bulk import
  (1–500), phone/email/url validation, statuses.
- **Backend leads module** (`backend/src/leads/`): `requireAuth` middleware
  (`backend/src/auth/middleware.ts`), `LeadsService`, OpenAPI routes under
  `/api/leads` — create/list/get lists, add/list leads, update lead status. All
  auth-gated and scoped to the signed-in user.
- **Webapp** `/leads` page (`webapp/src/leads-page.tsx`): target lists +
  businesses with phones + call-status table. API client exposed on auth context.
- **AI caller spec**: `docs/AI_CALLER.md` (architecture, lifecycle, env, order).

## Lead pipeline statuses

`NEW`, `QUEUED`, `CALLING`, `CALLED`, `INTERESTED`, `NOT_INTERESTED`, `CALLBACK`,
`INVALID`, `DO_NOT_CALL`.

## Build / validate commands

```bash
bun install
bun run typecheck                # all workspaces
bun run test:contracts           # 9 tests
bun run --cwd backend test:unit  # 21 tests (no DB needed)
bun run test:webapp              # 36 tests
bun run test:deploy              # 15 tests
```

Integration tests (`bun run --cwd backend test:integration`) and
`prisma migrate deploy` need **PostgreSQL 18** (schema uses `uuidv7()`); run them
in an environment that has Docker + Postgres 18.

## Chosen integrations (decided with the user)

- **Telephony: Twilio** (US numbers, Media Streams for real-time AI). Telnyx is
  the cheaper alternative if needed later.
- **Conversation: OpenAI GPT-4o** (Realtime API for low-latency voice).
- **Voice: ElevenLabs** (credits to be topped up; keep a TTS abstraction so the
  provider is swappable).

## Next implementation step (the AI caller)

Follow `docs/AI_CALLER.md`. In short:
1. Add optional env slots (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`,
   `ELEVENLABS_VOICE_ID`, `TELEPHONY_*`, `AI_CALLER_PUBLIC_BASE_URL`) to
   `backend/.env.example` + `backend/src/env.ts` (validated as an optional group
   like the `SPACES_*` block).
2. `POST /api/leads/leads/{leadId}/queue-call` → creates a `Call` (snapshots the
   phone), asks Twilio to dial.
3. Media-stream loop in `backend/src/worker.ts`: prospect audio → STT → GPT-4o
   (streaming, with outcome/callback/handoff tool calls) → ElevenLabs → caller
   audio, with barge-in.
4. Persist transcript/summary/recording/outcome; reconcile `Lead.status`.
5. Signed, idempotent Twilio webhooks + compliance (DNC scrub, calling hours,
   AI disclosure).

Also pending: an **enrichment pipeline** to auto-collect US B2B SaaS businesses
with phones into lists (currently leads are added manually or by bulk import via
`POST /api/leads/lists/{listId}/leads`). Extension point: `Lead.source`.

## Repository situation

Origin of the working session is `Talways/docs` (legacy fork name). The clean
single-commit history lives on branch `coldpilot-main`. The real home is
`https://github.com/Talways/coldpilot` — seeded from a git bundle because the
sandbox git proxy is scoped to `Talways/docs` and cannot push elsewhere.
