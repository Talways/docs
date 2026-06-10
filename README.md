# ColdPilot

ColdPilot builds targeted databases of businesses on demand — starting with
B2B SaaS companies — enriched with phone numbers, and then cold-calls them with
an AI voice agent that pitches a subscription. It is a full-stack monorepo built
on the [vibe](https://github.com/di-sukharev/vibe) template: a Bun/Hono backend,
a React CSR app (`webapp`), an Astro public site (`website`), and shared Zod API
contracts.

## What ColdPilot Does

1. **Build target lists.** A user describes who they want to reach (e.g. "B2B
   SaaS companies in the US, 11-50 employees"). That becomes a `LeadList`.
2. **Collect businesses with phone numbers.** Businesses are added to a list as
   `Lead` records (manually, by bulk import, or by an enrichment pipeline) with
   company, website, phone, email, and location.
3. **Cold-call with an AI agent.** Each lead can be queued for an outbound call.
   The AI caller (GPT-4o for the conversation, ElevenLabs for voice, plus a
   telephony provider) speaks to the business and pitches the subscription.
   Every attempt is recorded as a `Call` with status, outcome, transcript, and
   summary. See [docs/AI_CALLER.md](docs/AI_CALLER.md).

The business model is recursive: we use ColdPilot to cold-call B2B SaaS
companies and sell them a monthly subscription to the same AI caller, which they
then point at their own prospect lists.

## Project Setup Decisions

Recorded during installation from the template:

- **Project name / slug:** `coldpilot`. The workspace packages are scoped
  `@coldpilot/*`. The internal database name and refresh-cookie still use the
  template's `web_app_demo` identifier; renaming those infra tokens is a separate,
  optional pass and is intentionally deferred to keep the test/deploy harness
  stable.
- **Active surfaces now:** `backend/API` and `webapp`. The `website` (Astro) and
  `mobile` (Expo, on the `mobile` branch) surfaces are intact but deferred until
  there is public-SEO or mobile product work.
- **Accounts/auth & persistence:** active. The lead/call domain is owned, and the
  baseline email + password auth from the template gates every `/api/leads`
  route.
- **First user journey:** sign in → create a target list → add businesses with
  phone numbers → track each business's call status. The `/leads` page in the
  webapp drives this.
- **Real-time, uploads/media, payments:** deferred. No WebSocket, storage, or
  billing work is configured yet.
- **AI caller (GPT-4o + ElevenLabs + telephony):** modeled in the schema (`Call`)
  and specified in [docs/AI_CALLER.md](docs/AI_CALLER.md); the live telephony
  integration is a documented next step, not yet wired, because it needs
  provider accounts and webhooks.
- **Deployment:** local-only for now. DigitalOcean App Platform stays the
  supported production path (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)); no
  production remote is configured.

## Lead & Call API

All routes require a bearer access token from the auth flow and are scoped to the
signed-in user.

| Method & path | Purpose |
| --- | --- |
| `POST /api/leads/lists` | Create a target list (`name`, `query`, optional `targetIndustry`, default `B2B SaaS`). |
| `GET /api/leads/lists` | List the user's target lists with lead counts. |
| `GET /api/leads/lists/{listId}` | Fetch one list. |
| `POST /api/leads/lists/{listId}/leads` | Add 1–500 businesses to a list (manual entry or a bulk enrichment batch). |
| `GET /api/leads/lists/{listId}/leads?status=` | List businesses in a list, optionally filtered by status. |
| `POST /api/leads/leads/{leadId}/status` | Update a business's call/pipeline status. |

Lead pipeline statuses: `NEW`, `QUEUED`, `CALLING`, `CALLED`, `INTERESTED`,
`NOT_INTERESTED`, `CALLBACK`, `INVALID`, `DO_NOT_CALL`.

## What's Inside

- `backend` - Bun + Hono + Prisma + PostgreSQL, custom JWT auth, Zod validation, and OpenAPI output.
- `webapp` - React + Vite + TanStack Query/Form/Router CSR browser client with the baseline auth flow.
- `website` - a separate Astro project for public SSG/SSR pages (landing, content sites, marketplace).
- `mobile/README.md` - pointer to the runnable Expo mobile template on the `mobile` branch.
- `packages/contracts` - shared Zod schemas and TypeScript API types.
- `.do` - committed DigitalOcean App Platform spec templates; generate concrete specs into `.scratch/deploy` with `bun run deploy:do:specs`.
- `docker-compose.yml` - local PostgreSQL 18 through the official `postgres:18-alpine` image on port `54329`; test runners use a repository-derived port by default, or `POSTGRES_TEST_PORT` when set. PostgreSQL 18 is intentional because the backend schema uses strict database-generated UUIDv7 IDs.
- `docs/TESTING.md` - the backend and Playwright testing contract. Mobile Maestro guidance lives on the `mobile` branch.
- `docs/LOCAL_DATABASE.md` - cross-platform local PostgreSQL setup for Windows, macOS, and Linux.
- `docs/STORAGE.md` - DigitalOcean Spaces, CDN, uploads, and image/media storage rules.
- `docs/YANDEX_CLOUD.md` - optional Yandex Cloud deployment path when the user explicitly chooses it.

## Choosing `webapp` vs `website`

This template ships two browser surfaces. Putting a feature in the wrong one is the most common early mistake, so the installing agent must pick deliberately and explain the choice in product terms the user understands.

- Build it in **`website`** (Astro, static by default, SSR/hybrid only when needed) when pages must be **public and found by search engines or shared with rich link previews**: marketing/landing pages, content sites, blogs, docs, and the public storefront of a **marketplace**. For a marketplace, this usually means the landing page, category/search landing pages, public listing/product pages, SEO metadata, and rich previews.
- Build it in **`webapp`** (React, client-side rendered) when screens live **behind sign-in and do not need SEO**: login-adjacent app flows after redirect, buyer account, seller/admin panels, checkout/account workflows, dashboards, settings, and authenticated tools. No crawler needs these, so CSR is the simpler, cheaper choice.

Rule of thumb for the agent: *if a page must rank in search or preview nicely when shared, it belongs in `website`; if it is only reachable after login, it belongs in `webapp`.* Real marketplaces normally use **both**: the public catalog lives in `website`, the authenticated app lives in `webapp`, and both reuse the same `@web-app-demo/contracts` schemas. Do not rebuild SEO pages inside `webapp` to "keep everything in one app"; that loses the SEO the product needs. Do not move the full authenticated app into Astro just because the product has public SEO pages.

Astro stays the default website stack for this template because it is content-first, static-first, ships little JavaScript by default, and gives agents a clear SEO surface. Choose Next.js only when the project intentionally wants a Vercel-optimized ISR/cache platform as a core product requirement. Treat TanStack Start as an optional future React full-stack path for teams that want one React app with selective SSR; it is not the simple default for non-programmer vibe-coding projects.

## Quick Start

Install dependencies first:

```bash
bun install
```

If backend/API, full-stack, or other database-backed work is active, check Docker first. Docker is the local app that runs PostgreSQL for this template:

```bash
docker compose version
docker info
```

If either command fails, install and start Docker before continuing:

- Windows: install Docker Desktop, enable the WSL 2 backend, start Docker Desktop, then rerun `docker compose version` and `docker info`.
- macOS: install and start Docker Desktop, or another Docker Engine with Compose v2, then rerun `docker compose version` and `docker info`.
- Linux: install Docker Engine and the Docker Compose plugin, start the Docker service, then rerun `docker compose version` and `docker info`.

Do not switch new users to native PostgreSQL during local setup. The repository's documented local path is Docker Compose for backend/API work.

### Backend/API Or Full-Stack

Only run this block when backend/API, full-stack, or DB-backed validation is active.

```bash
docker compose pull postgres
docker compose up -d postgres
```

Create the backend env file:

```bash
# macOS, Linux, or Git Bash on Windows
cp backend/.env.example backend/.env
```

```powershell
# Windows PowerShell
Copy-Item backend/.env.example backend/.env
```

Then apply migrations:

```bash
bun run --cwd backend prisma:migrate
```

### Run The Active Surfaces

Start only the app surfaces you need in separate terminals:

```bash
bun run dev:backend
bun run dev:webapp
bun run dev:website
```

Webapp-only or website-only setups can skip the backend/PostgreSQL block until backend/API becomes active.

Create `webapp/.env` when the browser client should use a non-default API URL:

```bash
VITE_API_URL=http://localhost:3000
```

Test runners use the separate Docker Compose `postgres_test` service and the `TEST_DATABASE_URL` shape from `.env.example`/`backend/.env.example`. Webapp Playwright E2E starts `postgres_test`, applies migrations to `web_app_demo_test`, runs the browser flow, and tears down its test database volume by default.

## Workspace Commands

- `bun run dev` - start all workspace projects in parallel dev mode.
- `bun run dev:backend` - start the backend API.
- `bun run dev:webapp` - start the Vite CSR webapp.
- `bun run dev:website` - start the Astro website project.
- `bun run typecheck` - run TypeScript checks across workspaces.
- `bun run build` - run production build/typecheck/export scripts for workspaces that define them.
- `bun run test` - run contract, backend, and webapp unit/integration tests.
- `bun run test:contracts` - run shared Zod contract tests.
- `bun run test:backend` - run backend unit and integration tests.
- `bun run test:backend:integration` - run DB-backed auth tests through `postgres_test`.
- `bun run test:webapp` - run webapp client tests.
- `bun run deploy:do:specs` - safely generate concrete DigitalOcean specs under `.scratch/deploy`.
- `bun run e2e:webapp` - run the Playwright auth smoke test through backend + Vite.
- `bun run --cwd backend prisma:migrate` - create/apply a Prisma migration in development.
- `bun run --cwd backend prisma:deploy` - apply existing Prisma migrations on a server.

## Project READMEs

- [backend/README.md](backend/README.md) - API, auth, Prisma, and backend validation.
- [docs/LOCAL_DATABASE.md](docs/LOCAL_DATABASE.md) - Docker Compose PostgreSQL setup and reset workflow.
- [docs/STORAGE.md](docs/STORAGE.md) - DigitalOcean Spaces, CDN, uploads, and image/media storage rules.
- [docs/YANDEX_CLOUD.md](docs/YANDEX_CLOUD.md) - optional Yandex Cloud deployment path when explicitly selected.
- [webapp/README.md](webapp/README.md) - CSR browser client setup, env, and Playwright smoke.
- [mobile/README.md](mobile/README.md) - pointer to the full mobile template branch.
- [website/README.md](website/README.md) - Astro website commands, hybrid rendering, and publishing model.
- [packages/contracts/README.md](packages/contracts/README.md) - shared schema and DTO rules.

## Architecture Notes

API contracts live in `packages/contracts` and are imported by every active layer. The backend validates input with those Zod schemas, and the webapp client reuses the same schemas in TanStack Form and API calls. The `mobile` branch extends the same contract model for Expo.

The backend API flow is `route -> validation -> auth/session guard -> service -> Prisma -> DTO`. Routes stay thin, auth business logic lives in the feature service, and API, worker, and cron entrypoints share `src/runtime.ts` for env and Prisma setup.

Keep the default architecture monolithic. For DigitalOcean production, the backend/API default is one `apps-s-1vcpu-1gb` App Platform container so a new project starts inside the expected low-cost budget with Managed PostgreSQL while retaining a clear scale-up path. Add backend worker or scheduled-job components from the same Docker image only when a concrete background or periodic task exists; the deployment generator refuses to deploy the empty worker placeholder. For real-time features, a single backend instance can own its local WebSocket connections. If the backend is horizontally scaled and users connected to different instances must receive the same chat, presence, or live events, add a managed Redis-compatible Pub/Sub broker between instances, using DigitalOcean Managed Valkey on the default path or Yandex Managed Service for Valkey when Yandex Cloud is explicitly selected.

Ongoing engineering guidance lives in [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/TESTING.md](docs/TESTING.md), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). First-run download and product setup instructions live in this README.

## Current Upstream Documentation

For framework, API, deployment, or testing questions, consult the current upstream documentation linked here first. The repository docs describe this template's conventions; the linked docs are the authoritative source for tool behavior and provider-specific changes.

- Runtime and package manager: [Bun docs](https://bun.sh/docs)
- Backend framework: [Hono docs](https://hono.dev/docs)
- Database ORM: [Prisma docs](https://www.prisma.io/docs) and [PostgreSQL docs](https://www.postgresql.org/docs/)
- Validation and contracts: [Zod docs](https://zod.dev/)
- JWT library: [jose documentation](https://github.com/panva/jose)
- Web stack: [React docs](https://react.dev/reference/react), [Vite guide](https://vite.dev/guide/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [TanStack Form](https://tanstack.com/form/latest/docs/framework/react/quick-start), and [TanStack Router](https://tanstack.com/router/latest/docs/overview)
- Testing: [Playwright docs](https://playwright.dev/docs/intro)
- Website: [Astro docs](https://docs.astro.build/en/getting-started/)
- Local infrastructure: [Docker Compose docs](https://docs.docker.com/compose/) and [PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres)
- Deployment and storage: [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/), [DigitalOcean App specs](https://docs.digitalocean.com/products/app-platform/reference/app-spec/), [DigitalOcean Static Sites](https://docs.digitalocean.com/products/app-platform/how-to/manage-static-sites/), [DigitalOcean Managed Databases in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/), [DigitalOcean Valkey](https://docs.digitalocean.com/products/databases/valkey/), [DigitalOcean Dockerfile builds](https://docs.digitalocean.com/products/app-platform/reference/dockerfile/), [DigitalOcean Bun buildpack](https://docs.digitalocean.com/products/app-platform/reference/buildpacks/bun/), [doctl](https://docs.digitalocean.com/reference/doctl/), [doctl apps spec validate](https://docs.digitalocean.com/reference/doctl/reference/apps/spec/validate/), [DigitalOcean Container Registry](https://docs.digitalocean.com/products/container-registry/), [DigitalOcean Spaces](https://docs.digitalocean.com/products/spaces/), [DigitalOcean Spaces CDN](https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/), and [external CDN in front of App Platform](https://docs.digitalocean.com/products/app-platform/how-to/configure-external-cdn/)
- Optional Yandex Cloud path: [Yandex Cloud CLI](https://yandex.cloud/en/docs/cli/quickstart), [Yandex Serverless Containers](https://yandex.cloud/en/docs/serverless-containers/), [Yandex Container Registry](https://yandex.cloud/en/docs/container-registry/quickstart), [Yandex Managed PostgreSQL](https://yandex.cloud/en/docs/managed-postgresql/), [Yandex Managed Service for Valkey](https://yandex.cloud/en/docs/managed-redis/), [Yandex Object Storage static hosting](https://yandex.cloud/en/docs/storage/operations/hosting/setup), [Yandex Object Storage AWS CLI](https://yandex.cloud/en/docs/storage/tools/aws-cli), [Yandex Cloud CDN](https://yandex.cloud/en/docs/cdn/concepts/), and [Yandex Cloud Marketplace Image Resizer](https://yandex.cloud/en/marketplace/products/yc/image-resizer)
