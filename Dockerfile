# ---------- base (shared) ----------
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    BUN_CONFIG_REGISTRY=https://registry.npmjs.org/

# ---------- deps ----------
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production=false

# ---------- build ----------
FROM deps AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY tsconfig.json eslint.config.js bunfig.toml ./
COPY src ./src
RUN bun run build

# ---------- prod-deps ----------
FROM base AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ---------- runner ----------
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# wget is needed for HEALTHCHECK; apk first to keep it in the same layer
RUN apk add --no-cache wget

# Non-root user (Bun image ships with `bun` user, uid 1000)
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=bun:bun /app/src ./src

# Logs dir must be writable by the bun user
RUN mkdir -p /app/logs && chown -R bun:bun /app/logs

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1

CMD ["bun", "run", "src/server.ts"]
