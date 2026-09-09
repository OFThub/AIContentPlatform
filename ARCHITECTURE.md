# Architecture

## Request path

```
Browser
  └─ frontend/src/services/api.js        one axios instance, attaches the JWT
       └─ Express (backend/app.js)       helmet, CORS, compression, morgan, apiLimiter
            └─ routes/                   path + middleware chain only
                 └─ middleware/          auth, admin, per-route limiter, cache
                      └─ controllers/    parse the request, shape the response
                           └─ services/  business logic and every SQL statement
                                └─ config/  pg pool, redis client, Gemini client
```

The layering is strict and enforced by review, not by a framework: a controller that
runs SQL, or a route that holds logic, is a bug.

`backend/app.js` exports the app without listening. `backend/server.js` verifies
Postgres and Redis, then binds the port. That split is what lets the integration suite
mount the real app with supertest instead of booting a server.

## Response contract

Every endpoint answers with `{ success, message?, data? }`, including errors, which are
shaped by the single error handler at the bottom of `app.js`. Services attach a
`status` to errors they want surfaced (400, 403, 404, 503); anything else becomes a 500.

## Data model

| Table | Role |
| --- | --- |
| `users` | Accounts, `role` (`user` / `admin`), reputation |
| `categories`, `tags`, `content_tags` | Taxonomy |
| `contents` | Articles, counters, `embedding vector(768)` with an HNSW index |
| `content_events` | Range-partitioned by `event_date`; views, likes, shares |
| `comments` | Threaded via `parent_comment_id` |
| `bookmarks`, `follows` | Per-user relations |
| `search_logs` | Query, type, result count, user |

### Counters are derived, never written by hand

An interaction inserts a row into `content_events`. A trigger on that table updates
`contents.view_count`, `like_count` or `share_count`. `comment_count` is maintained by a
separate trigger on `comments`, so a delete decrements it.

This is why the partition coverage matters: `content_events` is partitioned by range on
`event_date`, and a row with no matching partition is rejected. A `DEFAULT` partition
catches anything the monthly partitions miss, so the write path cannot silently stop
working as time passes. `create_month_partition(date)` adds real monthly partitions.

### Materialized views

| View | Ranks |
| --- | --- |
| `mv_popular_contents` | Weighted views, likes and shares over a window |
| `mv_trending_contents` | Recent activity against the prior period |
| `mv_top_authors_by_category` | Authors per category, minimum three published items |

All three carry a unique index so `REFRESH MATERIALIZED VIEW CONCURRENTLY` is legal.
`POST /api/analytics/refresh-views` (admin only) triggers a refresh; in production this
belongs on a schedule.

## Caching

`middleware/cache.js` implements cache-aside with `shortCache`, `mediumCache` and
`longCache` presets, keyed on method and URL. It is applied only to responses that are
identical for every viewer.

`GET /api/contents/:idOrSlug` is deliberately **not** cached: the response carries the
viewer's `is_bookmarked` flag, and the handler logs a view event. A shared cache there
would both leak one viewer's state to everyone and swallow the view count.

Invalidation uses `SCAN`, not `KEYS`, because `KEYS` blocks the Redis main thread across
the whole keyspace and invalidation runs on every content write.

## AI

Gemini is reached through its OpenAI-compatible endpoint, so the `openai` SDK is used
unchanged — only the base URL, models and key differ.

The client is constructed on first use. Building it at import time meant a missing key
threw while loading the module and took the whole API down, rather than disabling the
two endpoints that actually need it.

Embeddings are requested at 768 dimensions. Gemini defaults to 3072, but pgvector's
HNSW index refuses more than 2000, and the column width must match exactly.

## Schema changes

`database/init.sql` is the v1 baseline and runs once, on an empty volume, via the
Postgres entrypoint. Every change after that is a numbered file in
`database/migrations/`, applied by `npm run migrate` inside a transaction and recorded
in `schema_migrations`. Migrations are forward-only; there is no down path.
