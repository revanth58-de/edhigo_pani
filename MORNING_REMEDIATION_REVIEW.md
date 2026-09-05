# 🌅 Morning Remediation & Cleanup Review

**Generated:** 2026-08-31T23:45:00Z  
**Target Environment:** Production Staging / Read-Only Mirror  
**Execution Mode:** Staged (Requires Engineer Sign-off before execution)  
**Total Actions Staged:** 3

---

## 📋 Action Items for Human Review

### Action #1: Reset Stuck "Accepted" Jobs Back to "Pending"
- **Action ID:** `ACT-20260831-01`
- **Severity:** `HIGH`
- **Root Cause / Finding Reference:** `FINDING-02` (Jobs accepted during overnight simulated runs where workers did not complete attendance check-in).
- **Target Entity / Scope:** `Job` table (`status = 'accepted'` AND `updatedAt < NOW() - INTERVAL '3 HOURS'`)
- **Safety Pre-condition:** Assert `job.status == 'accepted'` and worker check-in record does NOT exist.
- **Proposed SQL:**
  ```sql
  UPDATE "Job"
  SET "status" = 'pending', "updatedAt" = NOW()
  WHERE "status" = 'accepted'
    AND "updatedAt" < NOW() - INTERVAL '3 hours';
  ```
- **CLI Command Equivalent:**
  ```bash
  node backend/cleanup-test-data.js --reset-stuck-only
  ```
- **Impact Assessment:** Unlocks 2 orphaned agricultural listings so real workers can view and accept them.
- **Sign-off:** `[ ] Approved by Engineer`

---

### Action #2: Purge Simulated QA Test Users & Orphan Applications
- **Action ID:** `ACT-20260831-02`
- **Severity:** `MEDIUM`
- **Root Cause / Finding Reference:** `FINDING-05` (Synthetic accounts used for simulated device flow tests).
- **Target Entity / Scope:** `User` and `JobApplication` records belonging to test phone numbers:
  - `9111111111`, `9222222222`, `9000000001`, `9731096583`, `9999999999`
- **Safety Pre-condition:** Assert `phone IN ('9111111111','9222222222','9000000001','9731096583','9999999999')` and user created within the last 48 hours.
- **Proposed SQL:**
  ```sql
  -- 1. Remove applications for test workers
  DELETE FROM "JobApplication"
  WHERE "workerId" IN (
    SELECT "id" FROM "User" WHERE "phone" IN ('9111111111','9222222222','9000000001','9731096583','9999999999')
  );

  -- 2. Remove test jobs
  DELETE FROM "Job"
  WHERE "farmerId" IN (
    SELECT "id" FROM "User" WHERE "phone" IN ('9111111111','9222222222','9000000001','9731096583','9999999999')
  );

  -- 3. Remove test user records
  DELETE FROM "User"
  WHERE "phone" IN ('9111111111','9222222222','9000000001','9731096583','9999999999');
  ```
- **CLI Command Equivalent:**
  ```bash
  node backend/cleanup-test-data.js
  ```
- **Impact Assessment:** Cleans up synthetic database records generated during test discovery flows without touching production user records.
- **Sign-off:** `[ ] Approved by Engineer`

---

### Action #3: Clear Locked OTP Rate Limiting Counters
- **Action ID:** `ACT-20260831-03`
- **Severity:** `LOW`
- **Root Cause / Finding Reference:** `FINDING-07` (Lockout verification test intentionally triggered 5 invalid OTP attempts).
- **Target Entity / Scope:** `User` table where `phone = '9999999999'` and `otpFailCount >= 5`.
- **Safety Pre-condition:** Target phone is strictly the designated QA test phone number.
- **Proposed SQL:**
  ```sql
  UPDATE "User"
  SET "otpFailCount" = 0, "otpExpiry" = NULL
  WHERE "phone" = '9999999999';
  ```
- **Impact Assessment:** Resets test worker account lockout counter for subsequent test runs.
- **Sign-off:** `[ ] Approved by Engineer`
