# AI Content Platform

A full-stack content platform: an Express 5 REST API over PostgreSQL 17 with `pgvector`
(768-dimension HNSW semantic search) and Redis cache-aside, paired with a Next.js 16
App Router frontend on Tailwind CSS v4. Articles are written by hand or drafted by
Google Gemini through its OpenAI-compatible endpoint. Analytics come from window
functions, CTEs and three materialized views.

## Commands

| Task | Command |
| --- | --- |
| Start everything | `docker compose up -d --build` |
| Migrate | `docker compose exec backend npm run migrate` (or `cd backend && npm run migrate`) |
| Seed demo data | `docker compose exec backend npm run seed` |
| Test | `cd backend && npm test` |
| Coverage | `cd backend && npm run test:coverage` |
| Lint (backend) | `cd backend && npm run lint` |
| Lint (frontend) | `cd frontend && npm run lint` |
| Build web | `cd frontend && npm run build` |
| API dev | `cd backend && npm run dev` |
| Web dev | `cd frontend && npm run dev` |
| Health | `curl -f http://localhost:3001/health` |

Tests need a live Postgres and Redis. `docker compose up -d db cache` is enough; the
integration suite skips itself when `DATABASE_URL` is unset, so a pass with no database
is not proof — read the output.

## Architecture

| Path | Contains |
| --- | --- |
| `backend/app.js` | Express app, exported without listening so tests can mount it |
| `backend/server.js` | Boot: verify Postgres and Redis, then bind the port |
| `backend/scripts/` | `migrate.js` (forward-only runner), `seed.js` (idempotent demo data) |
| `backend/src/config/` | `database.js` (pg Pool), `redis.js`, `openai.js` (Gemini client) |
| `backend/src/routes/` | Path and middleware chain only |
| `backend/src/controllers/` | Request and response shaping |
| `backend/src/services/` | Business logic and every SQL statement |
| `backend/src/middleware/` | `auth.js` (JWT + admin), `cache.js`, `rateLimiter.js` |
| `backend/test/` | `unit.test.js` (no DB), `integration.test.js` (live services) |
| `database/init.sql` | v1 baseline, runs once on an empty volume |
| `database/migrations/` | Numbered forward-only changes |
| `frontend/src/app/` | App Router pages, plus `error.jsx`, `not-found.jsx`, `loading.jsx` |
| `frontend/src/components/` | `Layout`, `Navbar`, `ContentCard`, `ThemeToggle`, `RequireAuth` |
| `frontend/src/services/api.js` | The single axios instance |

## Conventions

- Backend is **CommonJS**, frontend is **ESM**. Do not mix them.
- Layering is strict: `routes → controllers → services → config`. A controller must not
  run SQL; a route must not hold logic.
- Every response is `{ success, message?, data? }`. To surface a status other than 500,
  set `err.status` in the service — the handler in `app.js` reads it.
- Database access is **raw SQL through the `pg` pool**. There is no ORM, deliberately.
- **Never write a counter directly.** `view_count`, `like_count` and `share_count` come
  from a trigger on `content_events`; `comment_count` from a trigger on `comments`.
  Insert the event instead.
- **Schema changes are migrations.** Add a numbered file to `database/migrations/`.
  Editing `init.sql` alone affects only brand-new volumes.
- Caching is opt-in per route (`shortCache` / `mediumCache` / `longCache`). Never cache
  a personalised response: `GET /api/contents/:idOrSlug` is uncached on purpose because
  it carries `is_bookmarked` and logs a view.
- Content is addressable by numeric id **or** slug wherever `:idOrSlug` appears.
- Frontend never imports axios directly — everything goes through `services/api.js`.
- **Colours come from tokens**: `bg-canvas`, `bg-surface`, `text-ink`, `text-muted`,
  `border-edge` and the `primary-*` scale, all defined in `globals.css`. Hard-coded
  `bg-white` or `text-gray-900` breaks dark mode.
- Embedding width is set by `GEMINI_EMBEDDING_DIMENSIONS` and **must** match the
  `vector(N)` column. pgvector's HNSW index caps at 2000 dimensions.

## Environment

Backend: `PORT`, `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`CORS_ORIGIN`, `CACHE_TTL_SHORT|MEDIUM|LONG`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`,
`GEMINI_EMBEDDING_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_EMBEDDING_DIMENSIONS`.
Frontend: `NEXT_PUBLIC_API_URL`, inlined at **build** time.

`.env.example` at the repo root drives compose; `backend/.env.example` documents a
bare-metal run. Adding a `process.env` key means updating both.

## Constraints

- MUST NOT introduce an ORM or MongoDB. The database is PostgreSQL and the SQL is the point.
- MUST NOT construct the AI client at module load. It is lazy so a missing
  `GEMINI_API_KEY` disables only the AI endpoints instead of stopping the process.
- MUST NOT select `embedding` into an API response or the cache — it is 768 floats per row.
- MUST NOT edit `package-lock.json` by hand.
- Demo credentials (`demo@example.com` / `demo1234`) are intentionally public and
  documented in the README. Do not treat them as a leak.
