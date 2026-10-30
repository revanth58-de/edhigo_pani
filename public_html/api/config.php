<?php
/**
 * config.php
 * Central configuration for MySQL database, Renflair SMS Gateway, and authentication parameters.
 * Place in public_html/api/
 */

// ── Database Configuration ──────────────────────────────────────────────────
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'dinasari_db');
define('DB_USER', getenv('DB_USER') ?: 'dinasari_user');
define('DB_PASS', getenv('DB_PASS') ?: 'YOUR_MYSQL_PASSWORD_HERE');
define('DB_PORT', getenv('DB_PORT') ?: 3306);
define('DB_CHARSET', 'utf8mb4');

// ── Renflair SMS Gateway Configuration ──────────────────────────────────────
// Renflair V1 API sends both SMS and WhatsApp automatically
define('RENFLAIR_API_KEY', getenv('RENFLAIR_API_KEY') ?: '4403b4b16e3df066b4d44bb00fd2daeb');
define('RENFLAIR_ENDPOINT', 'https://sms.renflair.in/V1.php');

// ── OTP Policy Configuration ────────────────────────────────────────────────
define('OTP_LENGTH', 4);                         // 4-digit OTP
define('OTP_EXPIRY_SECONDS', 300);               // Valid for 5 minutes (300s)
define('OTP_RESEND_COOLDOWN_SECONDS', 60);       // Resend available after 60s
define('OTP_MAX_ATTEMPTS', 5);                   // Maximum 5 incorrect attempts before lockout
define('OTP_HOURLY_RATE_LIMIT', 6);              // Max 6 OTP requests per phone per hour

// ── Security & JWT Secret ───────────────────────────────────────────────────
define('AUTH_SECRET_KEY', getenv('AUTH_SECRET_KEY') ?: 'dinasari_super_secret_jwt_key_change_in_production_2026');
define('TOKEN_EXPIRY_DAYS', 30);                 // Auth token valid for 30 days

// ── Error Reporting (turn off display in production) ────────────────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');
