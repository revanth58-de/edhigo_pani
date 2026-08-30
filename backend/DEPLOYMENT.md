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
