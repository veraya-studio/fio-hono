# AGENTS.md

Guide for AI / human agents working in the `pio-bun-minimal-boilerplate` repo.

## Stack
- **Runtime**: Bun `>=1.3.0` (see `engines` in `package.json`)
- **Language**: TypeScript (`tsconfig.json`, strict)
- **HTTP**: `Bun.serve` in `src/server.ts` (Hono app via `createApp()` in `src/app.ts`)
- **CLI**: `cac` in `src/cli/index.ts` (entry: `bin.pio` → `bun run src/cli/index.ts`)
- **Validation**: `envalid` (`src/lib/env.ts`) + `zod` (ad-hoc schemas)
- **HTTP client**: `ofetch`
- **Logger**: `winston` + `winston-daily-rotate-file` (output to `logs/`)
- **Lint**: `eslint` + `@antfu/eslint-config`
- **Test**: `bun test` (vitest-style)

## Key Scripts
| Command | Purpose |
|---|---|
| `bun run dev` | Hot-reload server (default port `env.PORT`) |
| `bun run start` | Production server (no reload) |
| `bun run cli` | Run CLI (`pio <cmd>`) |
| `bun run build` | Bundle to `dist/` (target `bun`) |
| `bun test` | Run tests |
| `bun run lint` / `lint:fix` | ESLint check / auto-fix |
| `bun run typecheck` | `tsc --noEmit` |

## Docker
- `Dockerfile` + `docker-compose.yml` are already provided. Build context is the repo root.
- `docker compose up --build` to run.
- Host logs: mount `logs/` or tail container logs.

## Folder Structure
```
src/
  server.ts        # Bun.serve entry + graceful shutdown
  app.ts           # createApp() — Hono app composition
  cli/index.ts     # cac CLI entry
  lib/             # env, logger, shared utils
  middleware/      # Hono middleware
  routes/          # HTTP route handlers
tests/             # bun test files
logs/              # rotated winston output
```

## Conventions
- **Path alias**: not set up yet (check `tsconfig.json` if you need to add one).
- **Env**: add new vars to `src/lib/env.ts` (envalid) and `.env.example`.
- **Logger**: use the `logger` from `src/lib/logger`. Do not use `console.log` directly.
- **Error response**: standard shape `{ ok: false, error: { message } }` (see `server.ts`).
- **Module type**: `"type": "module"` — ESM only, no CJS.
- **License**: MIT. Public boilerplate.

## Workflow for AI Agents

### Before editing
1. Run `bun install` if `node_modules` is missing.
2. Read the target file in full before changing it — do not assume.
3. Check `src/lib/env.ts` first if you need a new env var.

### While editing
- Prefer adding code in `lib/` / `middleware/` / `routes/` over patching `server.ts` directly.
- Type safety first — `bun run typecheck` must be clean before commit.
- Follow antfu style (auto-fix with `bun run lint:fix`).

### Before declaring done
Run **all** of these and make sure they pass:
```bash
bun run typecheck
bun run lint
bun test
```

If you touched the env schema, also update `.env.example`.

### Refactor tasks
- Lean mode by default — remove what is not needed, do not add abstractions.
- A smoke test script + compare-prod script are required before merging any large refactor.

### Commit & push
- **"Push branch baru" = push only, no auto-PR**. The user opens the PR manually.
- Commit messages can mix Indonesian and English.
