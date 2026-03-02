const rateLimit = require('express-rate-limit');

/**
 * Strict limiter for auth endpoints — prevents OTP spam & brute-force.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again in 15 minutes' },
});

/**
 * General API limiter — applied globally to /api/ as a fallback.
 * 60 requests per minute per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Upload limiter — file uploads are expensive, limit aggressively.
 * 5 uploads per minute per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please wait before uploading again' },
});

module.exports = { authLimiter, apiLimiter, uploadLimiter };
