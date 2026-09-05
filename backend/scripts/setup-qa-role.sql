-- ============================================================================
-- Overnight QA Agent Role Provisioning Script
-- Database: dinasari / app
-- Security Level: Strict Read-Only Engine Enforcement
-- ============================================================================

-- 1. Create the dedicated QA role with secure login credentials
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'qa_agent') THEN
    CREATE ROLE qa_agent LOGIN PASSWORD 'qa_agent_secure_overnight_password_2026';
  END IF;
END
$$;

-- 2. Grant basic connection privileges to the database
GRANT CONNECT ON DATABASE dinasari TO qa_agent;

-- 3. Restrict schema usage to read-only
GRANT USAGE ON SCHEMA public TO qa_agent;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO qa_agent;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO qa_agent;

-- Ensure future tables created by migrations also default to read-only for this role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO qa_agent;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO qa_agent;

-- 4. HARD ENGINE RESTRICTION: Reject any transaction that attempts write/DDL
-- Even if an agent sends raw SQL (INSERT/UPDATE/DELETE/TRUNCATE), PostgreSQL
-- engine immediately aborts with SQLSTATE 25006 (read_only_sql_transaction).
ALTER ROLE qa_agent SET default_transaction_read_only = 'on';

-- 5. Revoke write, DDL, and administrative privileges explicitly
REVOKE CREATE ON SCHEMA public FROM qa_agent;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM qa_agent;
REVOKE ALL PRIVILEGES ON ALL PROCEDURES IN SCHEMA public FROM qa_agent;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM qa_agent;
