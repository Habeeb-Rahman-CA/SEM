# syntax=docker/dockerfile:1.6
# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1: Build the NestJS app
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS build
WORKDIR /app

# Install deps in a dedicated layer for max cache reuse
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Prune dev deps from the module tree we're about to copy
RUN npm prune --omit=dev

# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2: Minimal runtime
# ═══════════════════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runtime
WORKDIR /app

# tini as PID 1 — reaps zombie children and forwards signals cleanly,
# which fixes graceful shutdown for the Nest app (SIGTERM inside k8s).
RUN apk add --no-cache tini curl \
    && addgroup -g 1001 nodejs \
    && adduser -S nestjs -u 1001 -G nodejs

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Drop root — running Node as non-root prevents container escapes from
# giving an attacker root on the host if the runtime is misconfigured.
USER nestjs

EXPOSE 3001

# HEALTHCHECK — orchestrators (docker, k8s, ECS) use this to decide when
# the container is ready to receive traffic and when to restart it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3001/api/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
