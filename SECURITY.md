# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than in a public issue.

Open a [GitHub security advisory](https://github.com/OFThub/AIContentPlatform/security/advisories/new)
for this repository. Expect an acknowledgement within a week.

Include what you can: affected endpoint or file, reproduction steps, and the impact you
believe it has.

## Scope

This is a demonstration project, not a hosted service. There is no production deployment
to compromise, so reports are about the code as published.

## Known, deliberate limitations

These are documented rather than fixed, because the project is a local demo:

- `docker-compose.yml` ships default Postgres credentials and an insecure default
  `JWT_SECRET`. Both are overridden through `.env`, and the README says so.
- The demo seed creates accounts with a published password (`demo1234`), including one
  with the `admin` role. That is the point of a demo account.
- There is no email verification, password reset, or refresh-token rotation.
- Rate limits are per-IP and in-process, so they reset when the container restarts and
  are not shared across replicas.

## What is handled

- Passwords are hashed with bcrypt; hashes are never selected into API responses.
- JWTs are verified per request; the admin role is read from the database on each
  admin-gated call, so revoking admin takes effect immediately rather than at expiry.
- All SQL uses parameterised queries.
- `helmet` sets security headers; CORS is restricted to `CORS_ORIGIN`.
- Credential endpoints are rate limited separately and more tightly than the API.
- Embeddings are never serialised into responses or the cache.
