<div align="center">

# AI Content Platform

**Semantic search, AI content generation and SQL-powered analytics — on PostgreSQL, pgvector, Redis and Next.js.**

[![CI](https://github.com/OFThub/AIContentPlatform/actions/workflows/ci.yml/badge.svg)](https://github.com/OFThub/AIContentPlatform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)

</div>

---

A full-stack content platform where articles are written by a person or drafted by a
model, indexed as 768-dimension vectors, and ranked by analytics built from window
functions, CTEs and materialized views rather than an application-side loop.

The whole stack starts with one command and seeds itself with a working demo account.

## Quickstart

```bash
git clone https://github.com/OFThub/AIContentPlatform.git
cd AIContentPlatform

cp .env.example .env          # optional: add GEMINI_API_KEY for the AI features
docker compose up -d --build

docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/health |

**Demo account:** `demo@example.com` / `demo1234` (the username `demo` works too).

The app runs without an API key. Semantic search and AI generation return `503` until
`GEMINI_API_KEY` is set; everything else works.

> Ports 3000/3001 already taken? Set `FRONTEND_PORT`, `BACKEND_PORT`,
> `NEXT_PUBLIC_API_URL` and `CORS_ORIGIN` in `.env`, then rebuild.

## Screenshots

Taken against the stack that `docker compose up` produces, after `npm run seed` --
no staging, no mockups.

| | |
| --- | --- |
| ![Home](docs/screenshots/01-home.png) | ![Dashboard](docs/screenshots/02-dashboard.png) |
| Browsing published content, sorted by recent, popular or trending. | Analytics from materialized views: totals, ranked authors, category breakdown. |

![Article in dark mode](docs/screenshots/03-article-dark.png)

An article in dark mode, signed in: view/like/share/bookmark actions and the comment thread.

## Features

- **Semantic search** over pgvector with an HNSW index, alongside Postgres full-text keyword search.
- **AI drafting** — `POST /api/contents/generate` turns a topic, tone and length into a published article.
- **Analytics** — trending, popular, per-category and per-author rankings from three materialized views, window functions and CTEs.
- **Social** — likes, shares, bookmarks, threaded comments and follows, with counters maintained by database triggers.
- **Auth** — JWT, bcrypt, per-route rate limiting, and an admin role read from the database.
- **Caching** — Redis cache-aside with short/medium/long TTL presets and `SCAN`-based invalidation.
- **Dark mode** — class-driven, applied before first paint, persisted per browser.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, lucide-react, axios |
| Backend | Node.js 20, Express 5, raw SQL over `pg` (no ORM) |
| Database | PostgreSQL 17 + pgvector, range-partitioned event table, 3 materialized views |
| Cache | Redis 7, cache-aside |
| AI | Google Gemini through its OpenAI-compatible endpoint (free tier) |
| Tests | `node:test` + supertest — 19 tests |
| CI | GitHub Actions — lint, tests against live Postgres + Redis, Docker build |

## Project structure

```text
AIContentPlatform/
├── backend/
│   ├── app.js                  # Express app, exported without listening so tests can mount it
│   ├── server.js               # Boot: verify Postgres + Redis, then listen
│   ├── scripts/                # migrate.js, seed.js
│   └── src/
│       ├── config/             # database.js, redis.js, openai.js (Gemini)
│       ├── routes/             # auth (9), contents (18), analytics (9)
│       ├── controllers/        # request and response only
│       ├── services/           # business logic and all SQL
│       └── middleware/         # auth, admin, cache, rate limiting
├── database/
│   ├── init.sql                # v1 baseline, runs once on an empty volume
│   └── migrations/             # forward-only changes after that
├── frontend/
│   └── src/
│       ├── app/                # / login register search trending dashboard
│       │                       # analytics create bookmarks profile
│       │                       # my-content content/[id]
│       ├── components/         # Layout, Navbar, ContentCard, ThemeToggle, RequireAuth
│       ├── contexts/           # AuthContext
│       └── services/api.js     # the single axios instance
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Environment

Copy `.env.example` to `.env`. Everything except the first two has a working default in
`docker-compose.yml`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | insecure dev value | Token signing. Generate with `openssl rand -base64 48` |
| `GEMINI_API_KEY` | empty | Free key from [AI Studio](https://aistudio.google.com/apikey). Empty disables AI only |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/aicontent` | Postgres connection |
| `REDIS_URL` | `redis://cache:6379` | Redis connection |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model |
| `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | Generation model |
| `GEMINI_EMBEDDING_DIMENSIONS` | `768` | Must stay at or below 2000 — pgvector's HNSW limit |
| `CACHE_TTL_SHORT` / `MEDIUM` / `LONG` | `60` / `300` / `3600` | Cache presets, seconds |
| `FRONTEND_PORT` / `BACKEND_PORT` | `3000` / `3001` | Host ports |

## API

Every response has the shape `{ success, message?, data? }`.

### Auth — `/api/auth`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/register` | — | Rate limited |
| POST | `/login` | — | The `username` field accepts a username **or** an email |
| GET | `/me` | JWT | |
| PUT | `/profile` | JWT | |
| PUT | `/password` | JWT | |
| GET | `/users/:id` | — | Public profile |
| POST / DELETE | `/users/:id/follow` | JWT | |
| GET | `/users/:id/follow-stats` | optional | Followers, following, `is_following` |

### Content — `/api/contents`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | optional | Filter, sort, paginate, keyword search |
| GET | `/popular`, `/trending` | — | Cached, from materialized views |
| GET | `/:idOrSlug` | optional | Numeric id or slug; logs a view |
| GET | `/:id/analytics` | — | |
| POST | `/search/semantic` | — | pgvector similarity, rate limited |
| POST | `/` | JWT | |
| POST | `/generate` | JWT | **AI generation**; `503` without a key |
| PUT / DELETE | `/:id` | JWT | Owner only |
| POST | `/:id/like`, `/:id/share` | JWT | |
| POST / DELETE | `/:id/bookmark` | JWT | |
| GET | `/bookmarks/me` | JWT | |
| GET / POST | `/:idOrSlug/comments` | — / JWT | |
| DELETE | `/comments/:commentId` | JWT | Author only |

### Analytics — `/api/analytics`

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/trending`, `/top-by-category`, `/leaderboard` | — |
| GET | `/categories`, `/search`, `/dashboard` | — |
| GET | `/content/:id/timeseries` | — |
| GET | `/user/:id/engagement` | JWT |
| POST | `/refresh-views` | **admin** |

## Development

```bash
# Backend against the compose database
cd backend && npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aicontent \
REDIS_URL=redis://localhost:6379 JWT_SECRET=dev npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

| Task | Command |
| --- | --- |
| Migrate | `cd backend && npm run migrate` |
| Seed | `cd backend && npm run seed` |
| Test | `cd backend && npm test` |
| Coverage | `cd backend && npm run test:coverage` |
| Lint | `cd backend && npm run lint` and `cd frontend && npm run lint` |
| Build web | `cd frontend && npm run build` |

Tests need a live Postgres and Redis. The integration suite skips itself when
`DATABASE_URL` is unset, so `docker compose up -d db cache` is enough.

## Architecture notes

- **Strict layering.** `routes → controllers → services → config`. Controllers never run SQL; routes never hold logic.
- **No ORM.** Every query is hand-written SQL, which is the point: window functions, CTEs, partitioned tables and vector operators are the subject matter.
- **Events drive counters.** Views, likes and shares are rows in a range-partitioned `content_events` table, and triggers derive `contents.view_count` and its siblings. A `DEFAULT` partition means the write path cannot silently break as time passes.
- **Migrations are forward-only.** `init.sql` is the v1 baseline and runs once on an empty volume; every later change is a numbered file under `database/migrations/`.
- **The AI client is built lazily**, so a missing key disables the AI endpoints instead of stopping the process from starting.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the request path and the data model.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Ömer Faruk Türkdoğdu
