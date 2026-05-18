const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// ── Admin JWT Auth — replaces static shared secret with short-lived tokens ──
//
// Flow:
//   1. Admin POSTs to /api/admin/auth/login with { secret }
//   2. Backend validates secret (timing-safe) and returns a signed JWT (2h TTL)
//   3. All subsequent admin requests use Authorization: Bearer <token>
//   4. The old x-admin-secret header is still accepted as a fallback during the
//      transition period so existing integrations don't break immediately.
//
// DDIA: Short-lived tokens mean a leaked credential is automatically invalidated
// within 2 hours, dramatically reducing blast radius vs. a permanent shared secret.

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
const ADMIN_JWT_TTL    = '2h';

// ── Strict rate limiter: 3 wrong attempts per 15 min per IP ──────────────────
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  skipSuccessfulRequests: true,
  message: { error: 'Too many admin auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/admin/auth/login ────────────────────────────────────────────────
// Validates the ADMIN_SECRET and returns a short-lived JWT.
const adminLogin = (req, res) => {
  const { secret } = req.body;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  }

  // Timing-safe comparison to prevent timing-based brute force
  let isValid = false;
  try {
    isValid = secret &&
      secret.length === adminSecret.length &&
      crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(adminSecret));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }

  // Issue short-lived JWT
  const token = jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    ADMIN_JWT_SECRET,
    { expiresIn: ADMIN_JWT_TTL }
  );

  res.json({
    token,
    expiresIn: ADMIN_JWT_TTL,
    message: 'Admin session created. Token expires in 2 hours.',
  });
};

// ── Middleware: verify admin JWT (or fall back to legacy x-admin-secret) ──────
const adminAuth = (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  }

  // 1. Prefer JWT from Authorization header (new flow)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET);
      if (payload.role !== 'admin') throw new Error('Not an admin token');
      req.adminPayload = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: `Admin token invalid or expired: ${err.message}` });
    }
  }

  // 2. Legacy fallback: x-admin-secret header (for backwards compat)
  const secret = req.headers['x-admin-secret'];
  let isValid = false;
  try {
    isValid = secret &&
      secret.length === adminSecret.length &&
      crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(adminSecret));
  } catch {
    isValid = false;
  }

  if (!isValid) {
    return res.status(401).json({
      error: 'Unauthorized. Use POST /api/admin/auth/login to obtain a JWT token.',
    });
  }

  next();
};

module.exports = { adminAuth, adminRateLimiter, adminLogin };
