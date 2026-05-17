const rateLimit = require('express-rate-limit');
const { logger } = require('./errorHandler');
const config = require('../config/env');

// Use config.nodeEnv (has 'development' fallback) instead of raw process.env.NODE_ENV
// which would be undefined if NODE_ENV is not explicitly set in .env
const isDev = config.nodeEnv !== 'production';

// In development, skip ALL rate limiting so tests can run freely.
// In production, enforce strict limits to block abuse.
const skipInDev = () => isDev;

/**
 * Strict limiter for OTP generation — prevents SMS bombing.
 * 5 requests per 30 minutes per IP in production.
 * Completely disabled in development for E2E testing.
 */
const otpLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  skip: skipInDev,
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
 * 10 requests per 15 minutes per IP in production.
 * Completely disabled in development for E2E testing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skip: skipInDev,
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
 * 100 requests per minute per IP in production.
 * Completely disabled in development for E2E testing.
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

/**
 * Upload limiter — file uploads are expensive, limit aggressively.
 * 5 uploads per minute per IP in production.
 * Completely disabled in development for E2E testing.
 */
const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  skip: skipInDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please wait before uploading again' },
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, otpLimiter };
