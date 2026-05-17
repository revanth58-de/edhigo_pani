// Admin middleware — validates ADMIN_SECRET header
// This is completely separate from the regular JWT auth system.
// Usage: curl -H "x-admin-secret: your-secret" http://localhost:5000/api/admin/...

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ── Strict rate limiter: 3 wrong attempts per 15 min per IP ──────────────
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: { error: 'Too many admin auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  }

  // SEC-3 FIX: Use timing-safe comparison to prevent timing-based brute-force
  let isValid = false;
  try {
    isValid = secret &&
      secret.length === adminSecret.length &&
      crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(adminSecret));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing admin secret' });
  }

  next();
};

module.exports = { adminAuth, adminRateLimiter };

