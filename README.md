# pio-bun-minimal-boilerplate

A minimal, production-shaped boilerplate for building HTTP servers on top of
[Bun](https://bun.sh). It ships with sensible defaults for logging,
environment validation, HTTP calls, linting, and a small optional CLI — without
locking you into a framework.

> Bun ≥ 1.3 · TypeScript strict · MIT

---

## Why

Most "minimal Bun boilerplates" either give you a 5-line `Bun.serve` snippet
that falls over the moment you add a third route, or they hand you a full
framework (Hono/Elysia) plus a kitchen-sink of opinions. This one sits in the
middle:

- **Bun-native** — uses `Bun.serve` directly, no framework.
- **Server-first** — the HTTP server is the primary entry point (`src/server.ts`).
  A small CLI in `src/cli/` is included as a starting point you can keep,
  extend, or delete depending on your needs.
- **Framework-free core** — routing, middleware, and error handling are ~80
  lines of plain code in `src/app.ts`. You can read it in one sitting.
- **Production-shaped plumbing** — environment validation, structured logging
  with log rotation, an HTTP client wrapper, and graceful shutdown.
- **Strict & linted** — TypeScript `strict: true` and
  [antfu's ESLint config](https://github.com/antfu/eslint-config) out of the box.
- **Bun-native tests** — `bun test` runs everything; no separate test
  framework, no extra config. The test suite covers the HTTP app and the
  optional CLI (unit + subprocess).

---

## Quick start

```bash
# 1. Install Bun (skip if you already have it)
curl -fsSL https://bun.sh/install | bash

# 2. Install dependencies
bun install

# 3. Copy env file
cp .env.example .env

# 4. Run the server (hot reload)
bun run dev

# 5. In another terminal, hit the health endpoint
curl http://localhost:3000/healthz
```

Expected response:

```json
{ "ok": true, "data": { "status": "ok", "uptime": 0.42, "env": "development", "timestamp": "..." } }
```

---

## Architecture

```
                ┌──────────────────────────────────────────────┐
                │        Optional CLI  (src/cli/index.ts)      │
                │   pio info · pio fetch /path · pio serve     │
                └──────────────────────────────────────────────┘
                                  │
                                  │  shares src/lib/*
                                  ▼
┌──────────────────────────────────────────────────────────────┐
│                    HTTP Server (Bun.serve)                   │
│                                                              │
│   request  →  middleware chain  →  route dispatch            │
│                                                              │
│   errorHandler  →  requestLogger  →  cors  →  routes         │
└──────────────────────────────────────────────────────────────┘
            │                │                │
            ▼                ▼                ▼
      ┌──────────┐     ┌──────────┐     ┌──────────────┐
      │  logger  │     │   env    │     │   fetcher    │
      │ winston  │     │ envalid  │     │   ofetch     │
      │ + rotate │     │ (schema) │     │ (HTTP client)│
      └──────────┘     └──────────┘     └──────────────┘
```

The server is the **primary entry point**. The CLI is a small companion that
reuses the same `env`, `logger`, and `fetcher` modules — there is no shared
startup flow between them. If you don't need a CLI, delete `src/cli/` and the
`bin` field in `package.json`; nothing else has to change.

**Request flow**

1. `Bun.serve` receives the request and hands it to `createApp()` in
   `src/app.ts`.
2. The middleware chain runs outermost-first:
   - `errorHandler` — catches everything, converts known errors to JSON, masks
     unknowns as 500.
   - `requestLogger` — logs method, path, status, duration.
   - `cors` — sets CORS headers and short-circuits `OPTIONS` preflight.
3. Dispatcher matches `(method, path)` against the flat `routes` table in
   `src/routes/index.ts`.
4. The matched handler runs and returns a `Response` built by the helpers in
   `src/lib/http.ts` (so every endpoint speaks `{ ok, data | error }`).

---

## Folder structure

```
pio-bun-minimal-boilerplate/
├── src/
│   ├── server.ts              # HTTP entry point (Bun.serve) — primary
│   ├── app.ts                 # App factory: middleware chain + route dispatch
│   ├── cli/
│   │   └── index.ts           # Optional CLI (cac) — remove if not needed
│   ├── routes/
│   │   ├── index.ts           # Flat route table
│   │   ├── health.ts          # GET /healthz
│   │   └── echo.ts            # POST /echo (Zod-validated example)
│   ├── middleware/
│   │   ├── error-handler.ts   # Global error → JSON
│   │   ├── logger.ts          # Per-request access log
│   │   └── cors.ts            # CORS headers + preflight
│   └── lib/
│       ├── env.ts             # envalid schema for process.env
│       ├── logger.ts          # winston + daily-rotate-file
│       ├── http.ts            # json/fail/HttpError helpers
│       └── fetcher.ts         # shared ofetch client
├── tests/
│   └── health.test.ts         # bun:test smoke tests
├── logs/                      # rotated log files (gitignored)
├── .env.example
├── .gitignore
├── bunfig.toml                # local Bun config (registry)
├── eslint.config.js           # antfu ESLint config
├── tsconfig.json              # strict TS
├── package.json
├── LICENSE                    # MIT
└── README.md
```

### When to grow this structure

The boilerplate is intentionally flat. Promote to per-feature folders once
you hit **~5+ endpoints for one resource**:

```
src/
└── routes/
    └── users/
        ├── users.routes.ts
        ├── users.service.ts
        ├── users.schema.ts
        └── users.test.ts
```

### Removing the CLI

The CLI is optional. To strip it out:

1. Delete `src/cli/`.
2. Remove the `bin` field from `package.json`.
3. Remove the `cli` and `cac` scripts/dependencies you no longer want.

No code in `src/server.ts` or `src/lib/` references the CLI, so removing it
is risk-free.

---

## Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `bun run dev`        | Start the server with hot reload (`bun --hot`)        |
| `bun run start`      | Start the server (no reload)                          |
| `bun run cli`        | Run the optional CLI (`info`, `fetch <path>`, `serve`)|
| `bun run build`      | Minified build via `bun build` → `dist/`              |
| `bun run lint`       | Run ESLint (antfu config)                             |
| `bun run lint:fix`   | Auto-fix lint issues                                  |
| `bun run typecheck`  | `tsc --noEmit`                                        |
| `bun test`           | Run tests (bun:test)                                  |

### CLI examples

```bash
# Print runtime info
bun run cli info

# Fetch a path through the shared ofetch client
bun run cli fetch /todos/1
```

---

## Environment variables

Validated at startup by `envalid` (see `src/lib/env.ts`). Missing or invalid
values throw immediately — no silent defaults, no broken runtime.

| Var              | Default                              | Notes                                |
| ---------------- | ------------------------------------ | ------------------------------------ |
| `PORT`           | `3000`                               | TCP port for `Bun.serve`             |
| `HOST`           | `0.0.0.0`                            | Bind address                         |
| `NODE_ENV`       | `development`                        | `development` / `test` / `production`|
| `LOG_LEVEL`      | `info`                               | winston level                        |
| `LOG_DIR`        | `./logs`                             | Where rotated logs land              |
| `LOG_MAX_SIZE`   | `20m`                                | Per-file rotation threshold          |
| `LOG_MAX_FILES`  | `14d`                                | Retention window                     |
| `API_BASE_URL`   | `https://jsonplaceholder.typicode.com` | Used by the fetcher example        |
| `API_TIMEOUT_MS` | `10000`                              | ofetch timeout                       |

---

## License

MIT © [Toya Labs](https://github.com/Toya-Labs)

---

## Docker

The repo ships a multi-stage `Dockerfile` and `docker-compose.yml` ready for
production-ish deployment. The image is based on `oven/bun:1.3.14-alpine`,
runs as a non-root user, and includes a healthcheck against `/healthz`.

### Build & run with Docker Compose (recommended)

```bash
docker compose up --build
# detached:
docker compose up -d --build
# tail logs:
docker compose logs -f app
# stop:
docker compose down
```

The service exposes port `3000` by default (override with `PORT=…` in your
shell or a `.env` file in the project root — `docker-compose.yml` reads it).

### Build & run with plain Docker

```bash
docker build -t pio-bun-minimal-boilerplate .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -v "$(pwd)/logs:/app/logs" \
  pio-bun-minimal-boilerplate
```

### Image details

- **Multi-stage build** — `deps` (full install) → `build` (compile) →
  `prod-deps` (production-only install) → `runner` (slim final image).
- **Production deps only** in the final image (`bun install --production`).
- **Non-root user** (`bun`, uid 1000) for the runtime stage.
- **Logs volume** — mount `/app/logs` to keep rotated logs out of the
  container filesystem.
- **Healthcheck** — `wget` against `/healthz` every 30s.

### Reusing for other projects

This `Dockerfile` is intentionally generic. To use it as a template for any
Bun-based service:

1. Copy `Dockerfile` and `.dockerignore` into the new project.
2. Adjust `CMD` if your entry point isn't `src/server.ts`.
3. The `docker-compose.yml` here is a working baseline — copy and edit
   environment variables, port mappings, and volume mounts as needed.
