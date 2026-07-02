<div align="center">

# 🔗 LinkForge

**A production-shaped URL shortener with click analytics.**

Type-safe full-stack monorepo — one Zod contract shared between a **Next.js 15** frontend and a **NestJS** backend, backed by **PostgreSQL**, **Prisma** and **Redis**.

[![CI](https://github.com/shuly69/linkforge/actions/workflows/ci.yml/badge.svg)](https://github.com/shuly69/linkforge/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![NestJS](https://img.shields.io/badge/NestJS-10-e0234e)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Demo

Create a link, share it, watch the clicks land in analytics — end to end:

![LinkForge demo](docs/screenshots/demo.gif)

## Screenshots

|                    Landing                     |                     Dashboard                      |
| :--------------------------------------------: | :------------------------------------------------: |
| ![Landing page](docs/screenshots/01-landing.png) | ![Dashboard](docs/screenshots/03-dashboard.png) |

|                     Per-link analytics                     |
| :--------------------------------------------------------: |
| ![Link analytics](docs/screenshots/04-analytics.png) |

---

## Why this project exists

Most portfolio apps stop at a CRUD wrapper around a database. LinkForge is built to demonstrate the parts that actually come up in production work:

- **A shared type/validation contract** — the same Zod schema validates a form in the browser *and* the request body on the server. No drift, no duplicated DTOs.
- **A hot path that isn't the database** — redirects resolve through a Redis read-through cache and record analytics *fire-and-forget*, so a redirect never waits on a write.
- **Real authZ, not just authN** — short-lived access tokens with silent refresh, plus role-based guards (`USER` / `ADMIN`).
- **Reproducible from zero** — `docker compose up` boots Postgres, Redis, the API (with migrations) and the web app. `pnpm dev` does the same for local development.

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │                Browser                        │
                    │   Next.js 15 (App Router, React 19)           │
                    │   TanStack Query · React Hook Form · Zod      │
                    └───────────────┬──────────────────────────────┘
                                    │  REST /v1  (Bearer JWT)
                                    ▼
        ┌───────────────────────────────────────────────────────────┐
        │                    NestJS API                              │
        │                                                           │
        │  Auth ── JWT (access/refresh) + Passport + Roles guard    │
        │  Links ── CRUD, ownership checks, code generation         │
        │  Analytics ── aggregation (time-series, breakdowns)       │
        │  Redirect ── public /:code  →  302 + fire-and-forget click│
        │  Throttler (rate limit) · Zod pipe · Exception filter     │
        └───────┬──────────────────────────────────┬────────────────┘
                │                                  │
        read-through cache                   system of record
                ▼                                  ▼
        ┌───────────────┐                  ┌──────────────────┐
        │     Redis     │                  │    PostgreSQL    │
        │ link:{code}   │                  │  Prisma ORM      │
        │ rate-limits   │                  │  users/links/... │
        └───────────────┘                  └──────────────────┘

              ▲                                   ▲
              └─────────── @linkforge/shared ─────┘
                     Zod schemas + TS types
                (imported by BOTH web and api)
```

### Request lifecycle of a redirect

1. `GET /:code` hits the public `RedirectController`.
2. `LinksService.resolve()` checks Redis (`link:{code}`). On a miss it reads Postgres and back-fills the cache (10-min TTL).
3. The controller returns a `302` immediately.
4. `AnalyticsService.recordClick()` runs *after* the response is dispatched — it hashes the IP (SHA-256), parses the User-Agent into a device class, and increments the denormalized `clickCount`. Any failure is logged, never surfaced.

---

## Tech stack

| Layer          | Choice                        | Why it's here                                                        |
| -------------- | ----------------------------- | -------------------------------------------------------------------- |
| Monorepo       | **pnpm workspaces + Turborepo** | Task graph + caching; `shared` builds before its consumers.        |
| Frontend       | **Next.js 15** (App Router), React 19 | Server components, file-based routing, standalone output.    |
| Data fetching  | **TanStack Query**            | Cache, invalidation, pagination `placeholderData`, mutations.        |
| Forms          | **React Hook Form + Zod**     | Same schema the API validates with — zero contract drift.            |
| Charts         | **Recharts**                  | Declarative time-series area chart.                                  |
| Backend        | **NestJS 10**                 | Modular DI, guards, pipes, interceptors, first-class Swagger.        |
| ORM            | **Prisma 6**                  | Type-safe queries, migrations, `groupBy` aggregations.               |
| Database       | **PostgreSQL 17**             | Relational integrity, `date_trunc` time-series.                      |
| Cache / limits | **Redis 7** (ioredis)         | Read-through redirect cache + rate limiting.                         |
| Auth           | **JWT** (access + refresh), Passport, **Argon2** | Argon2id hashing; rotating refresh tokens.        |
| Validation     | **Zod** (shared)              | One schema, two runtimes.                                            |
| Testing        | **Jest + Supertest**          | Unit tests + an e2e suite covering register → redirect → analytics.  |
| CI             | **GitHub Actions**            | Lint · typecheck · test · build against live Postgres + Redis.       |
| Delivery       | **Docker + Compose**          | Multi-stage images; one command to run everything.                   |

---

## Project structure

```
linkforge/
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # User · Link · Click models
│   │   │   └── seed.ts              # demo users + synthetic click history
│   │   └── src/
│   │       ├── auth/                # JWT strategy, guards, service, controller
│   │       ├── links/               # CRUD + Redis-cached resolution
│   │       ├── analytics/           # click recording + aggregation
│   │       ├── redirect/            # public /:code redirect (hot path)
│   │       ├── users/               # admin-only user listing (role demo)
│   │       ├── common/              # Zod pipe, exception filter, decorators
│   │       ├── config/              # env schema (validated at boot)
│   │       ├── prisma/  · redis/    # infrastructure providers
│   │       └── main.ts              # bootstrap, Swagger, CORS, versioning
│   └── web/                        # Next.js frontend
│       └── src/
│           ├── app/                 # App Router pages (landing, auth, dashboard)
│           ├── components/          # navbar, forms, chart, stat cards
│           └── lib/                 # axios client (+refresh), auth ctx, query hooks
├── packages/
│   └── shared/                     # @linkforge/shared — Zod schemas + types
├── .github/workflows/ci.yml        # CI pipeline
├── docker-compose.yml              # full stack in one command
├── turbo.json                      # task graph
└── pnpm-workspace.yaml
```

---

## Quick start

### Option A — Docker (everything, one command)

```bash
cp .env.example .env          # tweak secrets if you like
docker compose up --build     # postgres + redis + api (migrated) + web
```

- Web: <http://localhost:3000>
- API + Swagger: <http://localhost:4000/docs>

Then seed demo data (optional):

```bash
docker compose exec api pnpm prisma:seed
```

### Option B — Local development

```bash
# 1. Infra only
docker compose up -d postgres redis

# 2. Install + prepare
pnpm install
cp .env.example .env
#   For local (non-Docker) runs, point DATABASE_URL/REDIS_URL at localhost:
#   DATABASE_URL=postgresql://linkforge:linkforge@localhost:5432/linkforge?schema=public
#   REDIS_URL=redis://localhost:6379

pnpm --filter @linkforge/shared build
pnpm --filter @linkforge/api prisma:migrate:dev
pnpm --filter @linkforge/api prisma:seed

# 3. Run both apps (Turborepo)
pnpm dev
```

### Demo accounts (after seeding)

| Email                 | Password       | Role  |
| --------------------- | -------------- | ----- |
| `admin@linkforge.dev` | `Password123!` | ADMIN |
| `demo@linkforge.dev`  | `Password123!` | USER  |

---

## API overview

Base path: `/v1` · Interactive docs at `/docs` (Swagger, non-prod).

| Method   | Endpoint                 | Auth   | Description                          |
| -------- | ------------------------ | ------ | ------------------------------------ |
| `POST`   | `/auth/register`         | –      | Create account, receive tokens       |
| `POST`   | `/auth/login`            | –      | Exchange credentials for tokens      |
| `POST`   | `/auth/refresh`          | –      | Rotate tokens                        |
| `GET`    | `/auth/me`               | Bearer | Current identity                     |
| `POST`   | `/links`                 | Bearer | Create a short link                  |
| `GET`    | `/links`                 | Bearer | List own links (paginated, search)   |
| `GET`    | `/links/:id`             | Bearer | Get one owned link                   |
| `PATCH`  | `/links/:id`             | Bearer | Update (owner only)                  |
| `DELETE` | `/links/:id`             | Bearer | Delete (owner only)                  |
| `GET`    | `/analytics/overview`    | Bearer | Dashboard KPIs                       |
| `GET`    | `/analytics/links/:id`   | Bearer | Time-series + breakdowns             |
| `GET`    | `/users`                 | Admin  | List all users (role-gated)          |
| `GET`    | `/:code`                 | –      | **Public redirect** (302)            |
| `GET`    | `/health`                | –      | Liveness (db + redis)                |

---

## Design decisions & trade-offs

- **Shared Zod contract over generated clients.** A `packages/shared` schema is imported by both apps. The frontend validates forms with it; the backend enforces it via a tiny `ZodValidationPipe`. This is the single most valuable pattern here — the contract *cannot* silently drift.
- **Denormalized `clickCount`.** List views need a click total per link without scanning the `clicks` table. The counter is incremented in the same transaction as the click insert; the `clicks` table remains the source of truth for detailed analytics.
- **Fire-and-forget analytics.** Recording a click must never slow down or fail a redirect. `recordClick` is intentionally not awaited by the response, and swallows its own errors.
- **Privacy-aware analytics.** Raw IPs are never stored — they're SHA-256 hashed so unique-visitor counts work without holding PII.
- **Argon2id over bcrypt.** Memory-hard hashing, the current OWASP-recommended default.
- **Access + refresh tokens.** Short-lived access token (15 min) with a refresh token (7 days). The web client transparently rotates on a `401` and replays the original request, sharing a single in-flight refresh across callers.
- **Env validated at boot.** `configuration.ts` parses `process.env` through Zod once, so a misconfigured deploy fails fast with a readable message instead of a runtime surprise.

## What I'd add next

Honest scope boundaries for a focused portfolio piece:

- Refresh-token rotation with server-side revocation (jti allow-list in Redis).
- GeoIP enrichment for real country breakdowns.
- QR code generation and link expiry cron cleanup.
- OpenTelemetry traces + a Grafana dashboard.

---

## Scripts

```bash
pnpm dev          # run web + api in watch mode (Turborepo)
pnpm build        # build all packages
pnpm lint         # eslint across the monorepo
pnpm typecheck    # tsc --noEmit across the monorepo
pnpm test         # unit tests (api)
pnpm db:migrate   # prisma migrate deploy
pnpm db:seed      # seed demo data

# e2e (needs Postgres + Redis running — see Quick start)
pnpm --filter @linkforge/api test:e2e
```

## License

MIT © Oleksandr Shulenin
