# syntax=docker/dockerfile:1

# glibc base (bookworm, not alpine) so better-sqlite3's prebuilt binary loads.
FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- Install all deps (incl. dev) for the build ------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Build the Next.js app ---------------------------------------------------
FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production-only deps (smaller runtime node_modules) ---------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Runtime image -----------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=32323
ENV DANKE_DATA_DIR=/app/data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json next.config.ts ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY --chmod=0755 docker-entrypoint.sh ./docker-entrypoint.sh

# The data dir is normally a mounted volume; create it and hand /app to the
# unprivileged `node` user (uid 1000). A named volume inherits this ownership,
# so it's writable out of the box.
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 32323

HEALTHCHECK --start-period=40s --interval=30s --timeout=5s CMD \
  node -e "fetch('http://localhost:'+(process.env.PORT||32323)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Provisions the session secret, applies migrations, then serves.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
