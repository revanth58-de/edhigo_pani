const rateLimit = require('express-rate-limit');
const { logger } = require('./errorHandler');

/**
 * Strict limiter for OTP generation — prevents SMS bombing.
 * 5 requests per 30 minutes per IP.
 * NOTE: onLimitReached was removed in express-rate-limit v7.
 *       Use the `handler` callback instead.
 */
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this IP, please try again in 30 minutes' },
  handler: (req, res, next, options) => {
    logger.warn(`🛑 Rate limit reached: OTP requests. IP: ${req.ip}, Path: ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Limiter for auth verification — prevents brute-force.
 * 10 requests per 15 minutes per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes' },
  handler: (req, res, next, options) => {
    logger.warn(`🛑 Rate limit reached: Auth attempts. IP: ${req.ip}, Path: ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * General API limiter — applied globally to /api/ as a fallback.
 * 200 req/min in dev, 60 in production.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 500 : 60,
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
  max: process.env.NODE_ENV === 'development' ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please wait before uploading again' },
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, otpLimiter };
