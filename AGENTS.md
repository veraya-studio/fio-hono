# AGENTS.md

Guide for AI and human agents working in `fio-hono-cf`.

## Stack

- **Runtime**: Cloudflare Workers; Bun is the package manager and unit-test runner
- **Language**: strict TypeScript
- **HTTP**: Hono in `src/app.ts`, Worker entrypoint in `src/index.ts`
- **Database**: Cloudflare D1 through Prisma 7 and `@prisma/adapter-d1`
- **Validation/docs**: Zod through `@hono/zod-openapi`, Scalar at `/docs`
- **Authentication**: HS256 Bearer JWT through `hono/jwt`
- **Logger**: Winston Console JSON transport captured by Workers Logs
- **Lint**: ESLint with `@antfu/eslint-config`
- **Test**: Bun unit tests and Vitest Workers integration tests

## Key scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Generate types/client and start Wrangler locally |
| `bun run deploy` | Generate artifacts and deploy the Worker |
| `bun run build` | Wrangler dry-run build to `dist/` |
| `bun run cf-typegen` | Generate Cloudflare binding/runtime types |
| `bun run generate:module <name>` | Create and register a standardized feature module |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:migration:create <name>` | Generate SQL from the local D1 schema |
| `bun run db:migrate:local` | Apply migrations to local D1 |
| `bun run db:migrate:remote` | Apply migrations to remote D1 |
| `bun test` | Run Bun unit tests |
| `bun run test:worker` | Run Workers + D1 integration tests |
| `bun run lint` / `lint:fix` | Check or fix ESLint |
| `bun run typecheck` | Generate artifacts and run TypeScript |

## Folder structure

```text
src/
  index.ts          # Worker entrypoint
  app.ts            # Hono composition root
  lib/              # shared config, crypto, errors, logging, Prisma
  middleware/       # request context and JWT middleware
  modules/          # feature route/schema/service/repository folders
prisma/             # Prisma schema
migrations/         # Wrangler D1 SQL migrations
tests/              # Bun unit tests
worker-tests/       # Vitest Workers integration tests
scripts/            # migration, smoke, and comparison scripts
plopfile.ts         # module generator configuration
plop-templates/     # generator templates
```

## Conventions

- Keep HTTP, validation, and OpenAPI mapping in routes.
- Keep business rules in services.
- Repositories are the only module layer that calls Prisma.
- Use `bun run generate:module <name>` as the starting point for new modules,
  then replace its status example with feature-specific behavior.
- Use factory functions and explicit dependency injection; no DI container.
- Create Prisma and request logger state per request in Hono context.
- Add non-secret bindings to `wrangler.jsonc`; add local secrets to
  `.dev.vars.example` and regenerate binding types.
- Use the logger from Hono context. Do not log credentials, JWTs, password
  material, or other secrets.
- Keep responses in `{ ok, data | error }` envelopes.
- Do not use `prisma migrate dev`, `prisma db push`, or Prisma `$transaction`
  with D1.
- ESM only; no CommonJS.

## Workflow

Before editing, install dependencies if needed and read each target file in
full. Keep refactors lean and preserve unrelated working-tree changes.

Before declaring done, run:

```bash
bun run typecheck
bun run lint
bun test
bun run test:worker
bun run build
```

Large refactors also require the smoke and compare-prod scripts. If bindings or
secrets change, update `wrangler.jsonc` or `.dev.vars.example` and rerun
`bun run cf-typegen`.

**"Push branch baru" means push only, without opening a PR.** The user opens
the PR manually. Commit messages may mix Indonesian and English.
