# Dinasari Backend — Production Deployment & Database Migration Guide

This guide outlines the production deployment procedure, required environment variables, and **database migration safety rules** for the Dinasari Node.js/Express backend.

---

## 1. 🛑 CRITICAL DATABASE MIGRATION SAFETY RULE

> ### ⚠️ NEVER RUN `npx prisma db push` IN PRODUCTION!
>
> - **`npx prisma db push`** is meant **only for local development** prototyping with temporary test data. In production, `db push` can trigger unintended schema drift, bypass recorded migration histories, or risk catastrophic data loss.
> - **`npx prisma migrate deploy`** is the **ONLY approved command** for production deployments. It reads all pending SQL migrations from `backend/prisma/migrations/`, records applied migrations in the `_prisma_migrations` table, and applies them sequentially inside transactional boundaries.

---

## 2. Standard Production Deployment Pipeline

Whenever deploying a new release to production (Render, AWS ECS/EC2, Railway, DigitalOcean, etc.), execute the build and startup steps in this exact order:

```bash
# 1. Install exact production dependencies
npm ci --only=production

# 2. Generate the Prisma Client
npx prisma generate

# 3. Apply pending versioned database migrations
npx prisma migrate deploy

# 4. Start the production Node.js server
npm start
```

### Docker / Containerized Deployment
In Dockerized environments (Cloud Run, ECS, Kubernetes, Render), database migrations run automatically on every container startup:

```dockerfile
# backend/Dockerfile CMD
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
```

> **Why this is safe**: `npx prisma migrate deploy` is strictly **idempotent** — it queries the `_prisma_migrations` table and skips any migration that has already been applied, executing only new pending migrations in milliseconds.
>
> **Best Practice**: Whenever a new migration is introduced in a release, monitor the initial container deployment logs to ensure the migration applies cleanly before the server begins accepting traffic.

---

## 3. Production Environment Self-Check

On boot (`node src/server.js`), the backend executes an automatic pre-flight configuration audit via `src/config/env.js`.

The server will **refuse to boot and exit with code 1** if any of the following 12 production secrets are missing or contain placeholder values (`YOUR_...`, `REPLACE_WITH_...`):

1. `DATABASE_URL` (Must be PostgreSQL with `sslmode=require` — SQLite is rejected)
2. `JWT_SECRET` (Must be at least 64 characters)
3. `JWT_REFRESH_SECRET` (Must be distinct from `JWT_SECRET`)
4. `ADMIN_SECRET` (Master password for `/api/admin/login`)
5. `ADMIN_JWT_SECRET` (Must not equal `JWT_SECRET`)
6. `FAST2SMS_API_KEY` (Required for live Indian SMS OTP dispatch)
7. `RAZORPAY_KEY_ID` (Live payment key)
8. `RAZORPAY_KEY_SECRET` (Live payment secret)
9. `CLOUDINARY_CLOUD_NAME`
10. `CLOUDINARY_API_KEY`
11. `CLOUDINARY_API_SECRET`
12. `SENTRY_DSN`

### Additional Production Security Checks:
- **`GEOFENCE_ENABLED`**: Must be `true` in production to enforce 100m GPS radius on worker check-in/out QR scans.
- **`ALLOWED_ORIGIN`**: Must be set to `https://www.dinasari.co.in` (wildcard `*` will trigger a security warning).

---

## 4. Rollback & Migration Troubleshooting

If a migration fails during `npx prisma migrate deploy`:
1. Check migration status:
   ```bash
   npx prisma migrate status
   ```
2. If a migration is marked as rolled back or failed:
   ```bash
   npx prisma migrate resolve --rolled-back "<migration_name>"
   ```
3. Never manually modify the `_prisma_migrations` table without reviewing migration history.

---

## 5. Live Production Smoke Testing

After every deployment, verify the live server using the automated smoke test script:

```bash
node scripts/smoke-test-production.js https://www.dinasari.co.in
```

---

## 6. Pre-Flight Local Verification

Before deploying new versions, run these copy-paste commands in your terminal to verify database clients, tests, and containers locally:

### A. Prisma Generation & Unit/Integration Tests
```bash
cd backend
npx prisma generate
npm test
```
- **What Success Looks Like**:
  - `✔ Generated Prisma Client (v6.19.3)`
  - `Test Suites: 16 passed, 16 total`
  - `Tests: 154 passed, 154 total`
- **What Failure Looks Like**:
  - If Prisma binary download fails (e.g. offline/firewall blocking `binaries.prisma.sh`): check network connectivity or set `PRISMA_ENGINES_MIRROR`.
  - If tests fail: look for failed assertion traces in `tests/` output.

### B. Docker Build Verification
```bash
# Run from repository root (where backend/ folder is located)
docker build -t dinasari-backend-test ./backend
```
- **What Success Looks Like**:
  - Multi-stage build completes all steps (`Stage 1 [builder]` and `Stage 2 [runner]`).
  - Successfully tagged `dinasari-backend-test:latest`.
  - `npx prisma migrate deploy` in `CMD` does **not** fail during build time because `CMD` only executes when a container is instantiated with a live `DATABASE_URL`.
- **What Failure Looks Like**:
  - Missing native build tools: `apk add python3 make g++` handles native modules.
  - Omitted dependencies: `prisma` is under `dependencies` in `package.json` to ensure runtime CLI availability.

---

## 7. Security & Dependency Vulnerability Context

### Prisma Tooling Advisory (GHSA-ggr8-5vv4-36mx / `deepmerge-ts`)
- **Package Chain**: `backend` → `prisma@6.19.3` → `@prisma/config@6.19.3` → `deepmerge-ts@7.1.5`
- **Advisory Details**: High-severity advisory for `deepmerge-ts < 8.0.0` regarding potential stack exhaustion when merging deeply recursive object graphs.
- **Risk Assessment for Dinasari**: **Negligible / Zero Runtime Risk**.
  - `deepmerge-ts` is used exclusively during build and deployment CLI configuration parsing (`npx prisma generate` / `npx prisma migrate deploy`).
  - It is never invoked during runtime HTTP request processing and is never exposed to user-controlled payloads.
- **Monitoring & Remediation**:
  - Automated CI dependency audit (`.github/workflows/backend-tests.yml`) monitors for any newly introduced high-severity vulnerabilities while allowlisting this build-time tool.
  - Upgrade to Prisma 7.x/8.x will be scheduled once Prisma publishes a stable migration path for the serverless database adapter ecosystem.
