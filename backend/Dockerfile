# ─── DINASARI Backend — Dockerfile ────────────────────────────────────────
# Multi-stage build: keeps the production image lean (~200MB vs 1.2GB)
#
# Build:  docker build -t dinasari-backend .
# Run:    docker run -p 5000:5000 --env-file .env dinasari-backend

# ── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Build Prisma client ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Stage 3: Production image ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 dinasari

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy generated Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy application source
COPY src ./src
COPY prisma ./prisma

# Create logs directory with correct permissions
RUN mkdir -p logs && chown -R dinasari:nodejs logs

USER dinasari

EXPOSE 5000

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
