# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — DINASARI Backend (Node.js / Express)
# Multi-stage build: keeps the final image lean (~200 MB vs ~600 MB)
#
# Stage 1 (builder): installs ALL deps + generates Prisma Client
# Stage 2 (runner):  copies only production deps + built artifacts
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install system deps required by some native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files first for layer caching — only reinstall if lock changes
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and generate the client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source
COPY src ./src

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Use a non-root user for security — never run Node as root in production
RUN addgroup -S dinasari && adduser -S dinasari -G dinasari
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy only production node_modules (no devDependencies)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Prisma schema (needed at runtime for migrations)
COPY --from=builder /app/prisma ./prisma

# Copy application source
COPY --from=builder /app/src ./src

# Switch to non-root user
USER dinasari

# Cloud Run sends traffic to PORT — expose it
EXPOSE 8080

# Health check — Cloud Run uses this to know when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
