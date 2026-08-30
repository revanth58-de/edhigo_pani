# Production Environment Configuration & Verification Matrix

This document lists all required configuration parameters, secrets, validation checks, and operational criteria for deploying Dinasari to production.

---

## 1. Environment Variables Audit Matrix

| Variable | Required | Production Value / Pattern | Description & Security Purpose |
|---|---|---|---|
| `PORT` | Yes | `5000` (or host assigned) | Express backend listener port. |
| `NODE_ENV` | Yes | `production` | Enables production security checks (blocks placeholder JWTs, enables strict rate limiting, disables stack traces). |
| `API_BASE_URL` | Yes | `https://www.dinasari.co.in` | Canonical base URL for backend API and generated media assets. |
| `DATABASE_URL` | Yes | `postgresql://...` with `sslmode=require` | Hosted PostgreSQL connection string (Prisma PostgreSQL provider). **Never SQLite in production.** |
| `JWT_SECRET` | Yes | 64+ char random hex/base64 string | Signs user authentication tokens (7d). Must not be placeholder. |
| `JWT_REFRESH_SECRET` | Yes | 64+ char random hex/base64 string | Signs refresh tokens (30d). Must be different from `JWT_SECRET`. |
| `ADMIN_SECRET` | Yes | Strong alphanumeric password | Protects admin portal login endpoint `/api/admin/login`. |
| `ADMIN_JWT_SECRET` | Yes | 64+ char random hex/base64 string | Signs admin session JWTs (2h TTL). Must not equal `JWT_SECRET`. |
| `FAST2SMS_API_KEY` | Yes | Fast2SMS production API key | Sends real SMS OTP messages to Indian mobile numbers. |
| `RAZORPAY_KEY_ID` | Yes | `rzp_live_...` | Razorpay live key identifier for processing farmer-to-worker settlements. |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay live secret | Razorpay secret key for webhook and order signature verification. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary account cloud name | Used for worker ID, farm photos, and avatar image storage. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key | Media upload API authentication. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret | Media upload API authorization. |
| `SENTRY_DSN` | Yes | `https://...ingest.sentry.io/...` | Real-time crash and error reporting. |
| `ALLOWED_ORIGIN` | Yes | `https://www.dinasari.co.in` | Strict CORS origin header (never `*` in production). |
| `GEOFENCE_ENABLED` | Yes | `true` | Enforces 100m GPS proximity radius on worker QR check-in / check-out. |
| `REDIS_URL` | Optional | `redis://...` | Redis adapter URL for multi-instance Socket.IO clustering. |

---

## 2. Generating Cryptographic Secrets

Run this in Node.js to generate unique, secure 64-byte tokens for each secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generate 3 separate values for:
1. `JWT_SECRET`
2. `JWT_REFRESH_SECRET`
3. `ADMIN_JWT_SECRET`

---

## 3. Database Safety Checklist

1. **Provider Check**: Ensure `backend/prisma/schema.prisma` specifies `datasource db { provider = "postgresql" }`.
2. **Migrations Check**: Run `npx prisma migrate deploy` in the production CI/CD pipeline (never `db push` in production).
3. **Connection Pooling**: Neon / AWS RDS connections must include `?connection_limit=10&pool_timeout=20` to prevent pooling exhaustion under heavy agricultural harvest seasons.
4. **Data Isolation**: Verify test databases (`test.db`, `dev.db`) are removed from git history and never mounted in production containers.

---

## 4. Mobile App Configuration

1. **`EXPO_PUBLIC_API_URL`**: Set to `https://www.dinasari.co.in` in `mobile/.env` and `mobile/eas.json`.
2. **Google Maps API Key**: Dynamically loaded via `mobile/app.config.js` (`GOOGLE_MAPS_API_KEY`).
3. **Key Restrictions**: Ensure Google Cloud Console restricts the key to:
   - Android Package: `com.dinasari.app`
   - Release SHA-1 Fingerprint
   - iOS Bundle ID: `com.dinasari.app`
