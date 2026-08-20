# fio-hono-cf

Workers-native API boilerplate built with Hono, Cloudflare D1, Prisma, JWT,
OpenAPI, and Scalar. Bun remains the package manager and unit-test runner; the
production runtime is Cloudflare Workers only.

## Stack

- Hono with `@hono/zod-openapi`
- Cloudflare Workers and D1
- Prisma 7 with the D1 driver adapter
- HS256 Bearer JWT through `hono/jwt`
- PBKDF2-HMAC-SHA256 password hashing through Web Crypto
- `hono/cors`
- Scalar API Reference at `/docs`
- Winston JSON logs through the Console transport and Workers Logs
- Bun unit tests plus Vitest Workers integration tests

## Quick start

```bash
bun install
cp .dev.vars.example .dev.vars
bun run db:migrate:local
bun run dev
```

Set `JWT_SECRET` in `.dev.vars` to at least 32 random bytes. One way to create
one is:

```bash
openssl rand -base64 32
```

The local API runs at `http://localhost:8787` by default. Open Scalar at
`http://localhost:8787/docs`.

## Project structure

```text
src/
  index.ts                    # Cloudflare Worker entrypoint
  app.ts                      # Hono composition root
  lib/                        # config, errors, HTTP envelope, crypto, Prisma
  middleware/                 # request logger, Prisma context, JWT auth
  modules/
    auth/                     # route, schema, service, repository, factory
    users/                    # route, schema, service, repository, factory
prisma/schema.prisma          # Prisma data model
migrations/                   # SQL applied by Wrangler D1
tests/                        # Bun unit tests
worker-tests/                 # Vitest tests inside the Workers runtime
scripts/                      # smoke, migration, and baseline comparison tools
plopfile.ts                   # module generator configuration
plop-templates/module/        # standardized module layer templates
```

Routes only translate HTTP and validation concerns. Services own business
rules, and repositories are the only layer that calls Prisma. Dependencies are
passed through factory functions; there is no container or class hierarchy.

Each API request gets its own `PrismaClient` backed by `new PrismaD1(env.DB)`.
The client, request-scoped Winston logger, and request ID live in Hono context.
No mutable request state is kept at module scope.

## Generate a module

Create and register a new module from the command line:

```bash
bun run generate:module products
```

The generator creates `index`, `schema`, `repository`, `service`, and `routes`
files under `src/modules/products/`, then mounts the module at
`/api/v1/products` in `src/app.ts`. Generated modules start with a compile-ready
`GET /status` example that demonstrates the expected HTTP → service → repository
flow. Replace that example with the module's actual business behavior.

Module names may contain letters and numbers separated by spaces, dashes, or
underscores. Plop normalizes file and route names to dash-case and exported
symbols to PascalCase. Generation aborts instead of overwriting an existing
module.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthz` | No | Health check |
| `POST` | `/api/v1/auth/register` | No | Register and return an access token |
| `POST` | `/api/v1/auth/login` | No | Login and return an access token |
| `GET` | `/api/v1/auth/me` | Bearer | Read the current user |
| `PATCH` | `/api/v1/users/me` | Bearer | Change the current user's name |
| `DELETE` | `/api/v1/users/me` | Bearer | Delete the current user |
| `GET` | `/openapi.json` | No | OpenAPI 3.1 document |
| `GET` | `/docs` | No | Scalar API Reference |

Every JSON response uses one of these envelopes:

```json
{ "ok": true, "data": {} }
```

```json
{ "ok": false, "error": { "message": "...", "code": "..." } }
```

Validation, authentication, missing resources, duplicate email, and unknown
errors map to HTTP 400, 401, 404, 409, and 500 respectively. Unknown errors are
logged but their internal details are not returned.

## Configuration

Non-secret defaults live in `wrangler.jsonc`:

| Binding | Default |
| --- | --- |
| `JWT_ISSUER` | `fio-hono-cf` |
| `JWT_AUDIENCE` | `fio-hono-api` |
| `JWT_TTL_SECONDS` | `3600` |
| `CORS_ORIGINS` | `*` (comma-separated values are supported) |
| `LOG_LEVEL` | `info` |

For production, store the JWT secret interactively instead of committing it:

```bash
bunx wrangler secret put JWT_SECRET
```

`wrangler.jsonc` deliberately omits an account ID and D1 database ID. Wrangler
4.45+ can provision the declared resource when deploying. No remote database
or Worker is created by setup commands in this repository.

Run `bun run cf-typegen` whenever bindings change. It reads the example secret
name and generates `CloudflareBindings` in the ignored
`worker-configuration.d.ts`; binding types are not duplicated by hand.

## Database workflow

Generate the client and apply the checked-in migration locally:

```bash
bun run db:generate
bun run db:migrate:local
```

After changing `prisma/schema.prisma`, create the next SQL migration from the
actual local D1 schema, inspect it, then apply it:

```bash
bun run db:migration:create add_profile_fields
bun run db:migrate:local
bun run db:migrate:remote
```

Prisma 7 removed the older `--from-local-d1` flag. The migration helper uses
the supported equivalent: `listLocalDatabases()` plus
`prisma migrate diff --from-config-datasource --to-schema ... --script`.

Do not use `prisma migrate dev`, `prisma db push`, or Prisma `$transaction`
with this boilerplate. Prisma's D1 adapter remains Preview, and interactive
transactions do not provide the expected ACID guarantees here.

## Authentication notes

- Emails are trimmed and stored lowercase.
- Passwords use a unique 16-byte salt, PBKDF2-HMAC-SHA256, 600,000 iterations,
  and a constant-time comparison. Algorithm metadata, iterations, salt, and
  hash are encoded together in the single `User.password` database field;
  plaintext passwords are never stored.
- Access tokens include `sub`, `email`, `iat`, `exp`, `iss`, and `aud` claims.
- JWT secrets shorter than 32 bytes fail closed.
- Refresh tokens, logout blacklists, RBAC, password reset, and email/password
  changes are intentionally outside this starter's scope.

## Logging

Winston writes structured JSON through its Console transport. Cloudflare
Workers Logs captures that output with `requestId`, method, path, status, and
duration. File rotation is intentionally absent because the Workers filesystem
is temporary and is not persistent log storage.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Generate types/client and start local Wrangler |
| `bun run deploy` | Generate artifacts and deploy (creates remote state) |
| `bun run build` | Wrangler dry-run bundle to `dist/` |
| `bun run cf-typegen` | Generate Workers bindings/runtime types |
| `bun run generate:module <name>` | Create and register a standardized feature module |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:migration:create <name>` | Diff local D1 into a new SQL migration |
| `bun run db:migrate:local` | Apply D1 migrations locally |
| `bun run db:migrate:remote` | Apply D1 migrations remotely |
| `bun run typecheck` | Generate artifacts and run TypeScript |
| `bun run lint` | Run ESLint |
| `bun run postinstall` | Regenerate binding types and Prisma Client |
| `bun test` | Run Bun unit tests |
| `bun run test:worker` | Run isolated Workers + D1 integration tests |
| `bun run smoke` | Check health and 404 on a running local Worker |
| `bun run compare-prod` | Compare health/404 against HEAD in a temp worktree |

For smoke testing, start `bun run dev` first. Override its target with
`BASE_URL=https://example.workers.dev bun run smoke`.

The compare script creates a detached temporary worktree at current `HEAD`,
starts the old and new servers on ports 8790/8791, compares normalized health
and 404 contracts, then removes the worktree. It does not deploy either build.

## Verification

```bash
bun run typecheck
bun run lint
bun test
bun run test:worker
bun run build
```

The Vitest pool currently bundles workerd compatibility through `2026-08-15`,
so the test config overrides only its local emulator date. Production remains
on the requested `2026-08-19` compatibility date in `wrangler.jsonc`.

## License

MIT © [Yottabyte](https://github.com/Yottabyte)
