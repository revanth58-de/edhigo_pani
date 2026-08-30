# 📋 Overnight QA Agent Readiness Audit

**Repository:** `Edhigo Pani / Dinasari`  
**Audit Scope:** Database Credentials, Automation Guardrails, Cleanup Governance, Observability Access, and Verifiable Spec Claims.  
**Generated Date:** 2026-08-30

---

## 🔍 Pre-Flight Checklist

### 1. Database Credentials & Role Isolation
- [ ] ⚠️ **FLAGGED — Unrestricted Local Database Credential:**  
  `backend/.env` specifies `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dinasari"`. The `postgres` superuser has full `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, and DDL privileges. If an agent executes scripts in this environment, it inherits write access.
- [ ] ⚠️ **FLAGGED — CI Workflow Database Access:**  
  `.github/workflows/ci.yml` uses `postgresql://postgres:postgres@localhost:5432/ci` with migration deploy permissions (`prisma migrate deploy`).
- [ ] ❌ **MISSING — Dedicated Read-Only Connection String:**  
  There is currently no `DATABASE_URL_READONLY` in `backend/.env.production.example` configured for a `qa_agent` role with `default_transaction_read_only = on`.

---

### 2. Prompting vs. Structural Guardrails
- [ ] ✅ **No Soft "Do Not Delete" Text Prompts in Repo:**  
  No existing prompt files rely on fragile natural language warnings.
- [ ] ⚠️ **ACTION NEEDED — Express Read-Only Middleware:**  
  `backend/src/server.js` currently accepts all incoming HTTP verbs. An Express gateway interceptor must be added to return `405 Method Not Allowed` on `POST`/`PUT`/`DELETE` whenever an agent request header or token is detected.

---

### 3. Test-Data Cleanup & Remediation Governance
- [ ] ✅ **Cleanup Exists as Static Reviewed Scripts:**  
  - `backend/cleanup-test-data.js`: Explicitly targets 5 hardcoded test phone numbers (`9111111111`, `9222222222`, etc.) and resets stuck jobs.
  - `backend/tests/helpers.js`: Contains `cleanupTestUsers()` targeting `9999999*` prefix.
- [ ] ⚠️ **ACTION NEEDED — Staged Remediation Capture:**  
  The agent must not invoke `cleanup-test-data.js` or `prisma.deleteMany` during the overnight run. All cleanup targets must be written to `MORNING_REMEDIATION_REVIEW.md` for human approval.

---

### 4. Observability & APM Access
- [ ] ✅ **Sentry Integrated in Backend & Mobile:**  
  - Backend: `@sentry/node` initialized in `backend/src/server.js` with tracing (`tracesSampleRate`).
  - Mobile: `@sentry/react-native` initialized in `mobile/src/config/sentry.js` with PII phone stripping.
- [ ] ❌ **MISSING — Sentry REST API Read Token for Agent:**  
  The agent needs a read-only Sentry auth token (`SENTRY_AUTH_TOKEN` with `org:read`, `project:read`, and `event:read` scopes) in its environment to query real production p50/p95 latency and unresolved issues without web browser interaction.

---

### 5. Documented Claims to Verify Against Production Traces

The following explicit performance and reliability claims in the repository documentation should be tested and verified by the overnight agent:

| Claimed Feature / Metric | Documented Source | Verification Method |
| :--- | :--- | :--- |
| **Real-time Socket Latency (<500ms)** | `project_reports/system_design_doc.md` | Benchmark Socket.io ping-pong and event propagation |
| **Spatial Matching Redis Speed (<1ms)** | `project_reports/optimization_deep_dive.md` | Profile Redis key lookup times for worker matching |
| **100m GPS Geofence Check-in** | `backend/src/config/env.js` | Test `POST /api/attendance/check-in` with out-of-range coordinates (expect 400 rejection) |
| **OTP Rate Limiting (5 Fail Lockout)** | `backend/prisma/schema.prisma` | Verify `otpFailCount` triggers `429 Too Many Requests` on attempt 6 |
| **Sentry PII Sanitization** | `mobile/store/privacy_policy.md`, `mobile/src/config/sentry.js` | Inspect Sentry event payloads to confirm phone numbers and OTPs are stripped |

---

## 🚦 Summary Readiness Status

| Category | Status | Action Required Before Overnight Run |
| :--- | :---: | :--- |
| **Database Isolation** | 🔴 **BLOCKED** | Provision `qa_agent` role with `default_transaction_read_only = on` and update test environment `DATABASE_URL`. |
| **API Gatekeeper** | 🟡 **PENDING** | Wire `enforceReadOnly` middleware for agent requests. |
| **Cleanup Governance** | 🟢 **READY** | Cleanup scripts exist; route agent findings to `MORNING_REMEDIATION_REVIEW.md`. |
| **Observability APM** | 🟡 **PENDING** | Provide read-only `SENTRY_AUTH_TOKEN` for automated trace/metric queries. |
| **Spec Verification** | 🟢 **READY** | 5 verifiable claims identified for the "Claimed vs. Observed" audit. |
