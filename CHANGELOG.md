# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `docker-compose.yml` bringing up Postgres (pgvector), Redis, the API and the web app with health checks and ordered startup, so the whole stack starts with one command.
- Forward-only migration runner (`backend/scripts/migrate.js`) with a `schema_migrations` table, plus five migrations covering event partitions, materialized-view indexes, comment counting, embedding width and the follows table.
- Idempotent demo seed (`backend/scripts/seed.js`): four accounts with real bcrypt hashes, twenty articles, tags and generated activity. Demo login is `demo@example.com` / `demo1234`.
- AI content generation: `POST /api/contents/generate` drafts an article from a topic, tone and length, then persists it through the normal create path.
- Threaded comments (`GET`/`POST /api/contents/:idOrSlug/comments`, `DELETE /api/contents/comments/:id`) and follows (`POST`/`DELETE /api/auth/users/:id/follow`, `GET .../follow-stats`).
- Eight frontend pages that previously 404-ed from the navbar: `/register`, `/create`, `/dashboard`, `/trending`, `/bookmarks`, `/profile`, `/my-content` and `/content/[id]`.
- Dark mode: class-driven, applied before first paint, persisted per browser, with a semantic colour-token layer in `globals.css`.
- `error.jsx`, `not-found.jsx` and `loading.jsx` app-shell boundaries, and a `RequireAuth` client guard that consumes the auth context's `loading` state.
- Test suite: 18 `node:test` tests, including regression tests pinning the event-partition, materialized-view-refresh and empty-update defects.
- GitHub Actions CI: backend lint and tests against live Postgres and Redis, frontend lint and build, and a Docker Compose build.
- `Spinner` component: the ten hand-rolled loading spinners now share one implementation with `sm`/`md`/`lg` sizes, a `primary`/`inverse` tone, and a `role="status"` label.
- `LICENSE` (MIT), `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`, PR and issue templates, `.env.example` files and `.dockerignore` files.

### Changed

- AI provider moved from OpenAI to Google Gemini through its OpenAI-compatible endpoint, so the free tier can serve both embeddings and generation with no new dependency. Embeddings are requested at 768 dimensions and `contents.embedding` narrowed to `vector(768)`, because pgvector's HNSW index caps at 2000.
- The Gemini client is now built on first use rather than at import, so a missing key disables only the AI endpoints.
- `backend/app.js` split from `backend/server.js` so tests can mount the app without binding a port; startup now verifies Postgres and Redis before listening, and `trust proxy` is set.
- Both Dockerfiles now build production images (`npm ci`, non-root, Next.js standalone output) instead of shipping dev servers.
- Content is addressable by slug as well as numeric id on the detail and comment endpoints, which is what the card links have always produced.
- `POST /api/analytics/refresh-views` is restricted to the new `users.role = 'admin'`.
- Login accepts an email address in the `username` field.
- Redis pattern invalidation uses `SCAN` instead of `KEYS`.
- The search, analytics, login and home pages moved off hard-coded Tailwind colours onto the semantic tokens the rest of the app already used (82 replacements). They were the four pages that predated the token layer and would have rendered dark text on dark backgrounds. The purple accent on the search page folded into the app's `primary` scale, which also removes the generated-UI palette tell the design detector flags.
- `README.md` rewritten from scratch; it previously described MongoDB, Mongoose, TypeScript and directories that did not exist.

### Fixed

- **Every view, like and share insert was failing.** `content_events` partitions covered only February to April 2026, so inserts outside that window were rejected, the metrics trigger never fired, and all trending, popular and leaderboard results were empty. A `DEFAULT` partition plus a `create_month_partition()` helper closes it permanently.
- **`POST /api/analytics/refresh-views` always returned 500.** `mv_top_authors_by_category` had no unique index, so `REFRESH MATERIALIZED VIEW CONCURRENTLY` was rejected.
- **Nobody could log in.** `init.sql` seeded users with the literal string `$2b$10$encrypted_password_hash` as their password hash.
- **The navbar never noticed a successful login.** `components/Layout.js` mounted a second `AuthProvider`, so pages and the navbar read different auth states and every navigation fired a duplicate profile fetch.
- **Semantic search always showed zero results.** The search page tested the response envelope for an array instead of unwrapping it.
- **`comment_count` could never be non-zero** — no trigger watched the comments table.
- **One viewer's bookmark state was served to everyone.** `GET /api/contents/:id` combined a shared response cache with per-viewer data; it is no longer cached, which also restores view logging that the cache had been swallowing.
- **Embeddings were serialised into every write response and into Redis** (768 floats per row) via `SELECT c.*` and `RETURNING *`.
- **Unpublished content leaked through the comment endpoints.** Comment lookups resolved a slug or id without the `status = 'published'` check that the article endpoint applies, so a draft's comments stayed readable and writable while the article itself returned 404.
- **An update with no recognised field produced invalid SQL**; it now returns 400.
- **Pagination reported `total: 0`** for any page past the end, because the count was read off the first row.
- **The leaderboard silently dropped authors** when filtered by category: a `WHERE` clause turned the intended `LEFT JOIN` into an inner join.
- Keyword searches were never written to `search_logs`, and `search_logs.user_id` was always null.
- `deleteContent` never decremented `tags.usage_count`.
- A `SIGTERM` crashed the process instead of draining: the shutdown handler referenced an undefined `server`.
- A single idle Postgres client error called `process.exit(-1)`, killing the API.
- Redis connected in a floating unawaited IIFE, so a failed connect produced a running server whose cache reads silently returned null.
- An invalid `created_at` crashed the whole page through `date-fns`; `ContentCard` now guards it.
- `tailwind.config.js` was dead under Tailwind v4 and defined a palette that conflicted with the live one; `primary-100` and `primary-300` were used in markup but never defined. Removed in favour of a single `@theme` source, and Inter is actually loaded now.

### Removed

- `frontend/src/app.js`, a dead Pages Router `_app.js` that nothing imported.
- `frontend/tailwind.config.js` and the untouched `create-next-app` `frontend/README.md`.
- The duplicated copies of `authMiddleware` and `optionalAuth` inside `rateLimiter.js`.
- `mongoose`, an unused ODM in a PostgreSQL-only project.
- `generateEmbeddingsBatch` and `cosineSimilarity`, never called — similarity is computed in Postgres.
- `docker-compose.yml` and `*.yml` from `.gitignore`, which is why the compose file appeared to have been deleted and would have hidden the CI workflow too.
