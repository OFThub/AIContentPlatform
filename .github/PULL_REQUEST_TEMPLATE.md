## What this changes

<!-- One or two sentences. What behaviour is different after this merges? -->

## Why

<!-- The problem, not the solution. Link an issue if there is one. -->

## How it was verified

<!-- Delete what does not apply, and say what you actually ran. -->

- [ ] `cd backend && npm run lint && npm test`
- [ ] `cd frontend && npm run lint && npm run build`
- [ ] `docker compose up -d --build` and clicked through the affected pages
- [ ] Added or updated a test that fails without this change

## Checklist

- [ ] Layering respected: SQL in services, no logic in routes
- [ ] Schema changes are a numbered file in `database/migrations/`
- [ ] Counters are derived by triggers, not written directly
- [ ] Frontend colours use the design tokens, so dark mode still works
- [ ] Documentation updated if behaviour or setup changed
