# 🌙 Overnight QA Agent Mission & Safety Runbook

**Mission:** Overnight unattended automated QA of the **DINASARI** platform against real/staging data.  
**Security Posture:** Structural Engine-Level Read-Only Isolation + Staged Remediation Capture.

---

## 🎯 Mission Statement & Authorizations

### You May:
- **Exercise User Flows:** Execute read and simulation flows via mobile simulator/test devices and API discovery endpoints.
- **Query Observability & Traces:** Query Sentry REST API for real issues, error stacks, and endpoint latency profiles (p50, p95).
- **Inspect Database (Read-Only):** Query PostgreSQL read-replica with the `qa_agent` role to verify data consistency, orphan records, and state transitions.
- **Inspect Repository:** Review source code, migration files, and system designs to compare expected system behaviors against observed traces.

### You May NOT:
- **Mutate Data:** No `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or `DROP` operations on the database.
- **Alter System Configuration:** No modifications to environment files (`.env`), deployment scripts, or API keys.
- **Execute Cleanup Scripts:** Do not run destructive deletion scripts like `backend/cleanup-test-data.js` or direct DB cleanup.
- **Trigger Outbound Side Effects:** Do not dispatch real SMS (Fast2SMS) or real payment transfers (Razorpay live mode).

### Deliverables:
1. **`OVERNIGHT_QA_FINDINGS.md`:** Findings ranked by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), each containing:
   - Concrete Evidence (Sentry trace link/issue ID, SQL query result, HTTP request/response).
   - Exact Reproduction Steps.
   - **Claimed vs. Observed Analysis** comparing documented spec metrics against production telemetry.
2. **`MORNING_REMEDIATION_REVIEW.md`:** Staged remediation and cleanup commands in an approved markdown format ready for one-click human execution in the morning.

---

## 🔒 Layered Read-Only Enforcement Matrix

| Layer | Hard Enforcement Mechanism | Failure Response |
| :--- | :--- | :--- |
| **PostgreSQL Database** | `ALTER ROLE qa_agent SET default_transaction_read_only = 'on';`<br>`REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES;` | PostgreSQL terminates query with **SQLSTATE `25006`** (`ERROR: cannot execute ... in a read-only transaction`). |
| **API Gateway (Express)** | `backend/src/middleware/qaReadOnly.js` intercepts all requests bearing `x-qa-agent: true` or `qa_agent` JWT token and blocks `POST`, `PUT`, `PATCH`, `DELETE`. | Express returns **HTTP `405 Method Not Allowed`** with code `AGENT_MUTATION_BLOCKED`. |
| **Third-Party Gateways** | API keys for SMS and Payments routed to mock endpoints or disabled via env flag in QA profile. | Third-party calls sink into mock endpoints without external billing or communication impact. |
| **Filesystem & Repo** | Read-only container filesystem / CI Git status assertion (`git status --porcelain`). | Pipeline fails immediately if any local repository file is modified during execution. |

---

## 👁️ How to Notice if the Agent Attempted Prohibited Actions

1. **PostgreSQL Log Monitoring:**
   Search PostgreSQL logs for SQLSTATE `25006` or role `qa_agent`:
   ```bash
   grep "qa_agent" /var/log/postgresql/postgresql.log | grep -E "ERROR: cannot execute|permission denied"
   ```
2. **API Access & Security Logs:**
   Filter Winston / CloudWatch logs for `AGENT_MUTATION_BLOCKED`:
   ```bash
   grep "AGENT_MUTATION_BLOCKED" backend/logs/combined.log
   ```
3. **Git Cleanliness Assertion:**
   Verify no local source files were modified or deleted:
   ```bash
   git status --porcelain
   ```
