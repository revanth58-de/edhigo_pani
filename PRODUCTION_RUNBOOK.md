# Dinasari — SRE Production Operational Runbook

This runbook outlines operational procedures, emergency mitigation steps, backup/restore routines, and disaster recovery processes for the **Dinasari** backend server deployed on **Google Cloud Run** and connected to **Neon.tech PostgreSQL**.

---

## 1. System Architecture overview

```
[Mobile Client (React Native)]  <-->  [Google Cloud Load Balancer (HTTPS)]
                                                   |
                                       [Cloud Run API Instances]
                                       |                       |
                               [Neon PostgreSQL]          [Memory Store Redis]
```

*   **API Platform:** Google Cloud Run (Fully managed, auto-scaling stateless Node.js containers).
*   **Database:** Neon.tech Serverless PostgreSQL (Scale-to-zero compute with remote block storage).
*   **Real-time Layer:** Socket.IO clustered across Cloud Run containers using a Redis adapter.
*   **Alerting & Monitoring:** Sentry Node SDK for application errors; Google Cloud Monitoring for CPU, memory, and networking metrics.

---

## 2. Backup & Restore Procedures

Database backups are configured using a Node-based, database-agnostic JSON export utility. This utility queries all transactional and master tables and stores them in a serialized format.

### 2.1 Triggering a Database Backup
Backups can be run manually or triggered via a Cron Scheduler.
To execute a backup:
```bash
cd backend
npm run db:backup
```
*   **Storage Location:** Backups are written to `backend/backups/backup-<ISO-Timestamp>.json`.
*   **Production Guideline:** In production, configure a Cloud Scheduler job to trigger a daily backup endpoint or run this script inside a Kubernetes CronJob / Cloud Run Job, copying the file to a Google Cloud Storage (GCS) Bucket.

### 2.2 Restoring from the Latest Backup
> [!CAUTION]
> The restore script completely purges existing records in the target database before inserting the backup. Always verify your connection credentials and environment variables before running this command!

To restore the database to the state of the latest backup file:
```bash
cd backend
npm run db:restore
```
*   The script automatically reads the latest JSON backup file inside `backend/backups/` and loads it into the database configured via the `DATABASE_URL` environment variable.

---

## 3. Rollback Procedures

If a newly deployed API release introduces regressions or severe errors, follow these steps to roll back immediately:

### 3.1 Cloud Run Version Rollback
1. Open the Google Cloud Console.
2. Navigate to **Cloud Run** and select the Dinasari backend service (e.g., `dinasari-backend`).
3. Click on the **Revisions** tab.
4. Select the previously working revision (identified by timestamp and git sha).
5. Click **Manage Traffic** and route 100% of traffic to that working revision.
6. Click **Save**. Traffic will shift instantly with zero downtime.

---

## 4. Disaster Recovery Plan

### 4.1 Database Outage / Connection Loss
*   **Detection:** The API `/health` check will return a `503 Service Unavailable` status and the JSON payload `{"status":"error","database":"disconnected"}`.
*   **Mitigation:**
    1. Verify connection status in the Neon.tech console.
    2. Check for active query blockages or locks on transactional tables (`machineryBooking`, `payment`, `user`).
    3. If Neon is experiencing an outage in the primary region, spin up a replica or restore the latest JSON backup to a secondary cloud PostgreSQL instance.
    4. Update the `DATABASE_URL` secret value in Google Secret Manager and trigger a redeployment/revision shift on Cloud Run.

### 4.2 Rate Limiting and DDoS Mitigation
*   **Configuration:** The backend uses `express-rate-limit` with `rate-limit-redis`.
*   **IP Lockout Mitigation:** If a user or integration is accidentally blocked by rate limiting, their block can be resolved by flushing the specific IP key in Redis or waiting for the expiration period (15 minutes for auth endpoints).
*   **Emergency Global Throttle:** If the server is overloaded, adjust the `max` field in `rateLimiter.js` and push a hotfix to Cloud Run.

---

## 5. Troubleshooting & Log Investigation

### 5.1 Request ID Tracing
Every incoming HTTP request is assigned a unique `X-Request-ID` header. This ID is automatically injected into all Winston log lines matching the request context.
*   To trace all actions during a transaction, grep the log stream for the specific `requestId`:
    ```bash
    # Example (using GCP Cloud Logging or standard local logs)
    grep "6b0dc52b-7d75-4725-ae27-f4a8eac23290" logs/combined.log
    ```
