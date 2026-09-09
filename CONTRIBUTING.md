# Contributing

Thanks for taking an interest. This is a portfolio project, so the bar is
"understandable to a stranger in six months" rather than "shipped to millions".

## Getting set up

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend npm run migrate
docker compose exec backend npm run seed
```

Sign in with `demo@example.com` / `demo1234`.

## Before you open a pull request

```bash
cd backend  && npm run lint && npm test
cd frontend && npm run lint && npm run build
```

The integration tests need a live Postgres and Redis; `docker compose up -d db cache`
is enough. They skip themselves when `DATABASE_URL` is unset, so a green run with no
database is not a green run — check the output.

## House rules

- **Respect the layering.** `routes → controllers → services → config`. SQL belongs in
  services. Routes declare paths and middleware, nothing else.
- **No ORM.** Queries are hand-written SQL on purpose.
- **Keep the response envelope.** Every endpoint answers `{ success, message?, data? }`.
  Attach a `status` to an error you want surfaced as something other than a 500.
- **Never write a counter by hand.** `view_count`, `like_count`, `share_count` and
  `comment_count` are derived by database triggers. Insert the event instead.
- **Schema changes are migrations.** Add a numbered file to `database/migrations/`.
  Editing `init.sql` only affects brand-new volumes, so on its own it changes nothing
  for anyone who already ran the project.
- **Frontend calls go through `src/services/api.js`.** No component imports axios.
- **Colours come from tokens.** Use `bg-surface`, `text-ink`, `text-muted`,
  `border-edge` and the `primary-*` scale so dark mode keeps working. Hard-coded
  `bg-white` or `text-gray-900` will look broken in dark mode.

## Commit messages

Plain imperative subject lines: `Fix comment count on delete`. No prefix convention is
enforced.
