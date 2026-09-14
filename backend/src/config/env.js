require('dotenv').config();
const crypto = require('crypto');

// Generate safe fallback keys if not configured in environment
const generateFallbackSecret = (name) => {
  const fallback = crypto.randomBytes(32).toString('hex');
  if (process.env.NODE_ENV === 'production') {
    console.warn(`⚠️ [ENV WARNING] ${name} is not set! Using an ephemeral crypto secret for this session. Please add ${name} in your Hosting Environment Variables.`);
  }
  return fallback;
};

const jwtSecret = process.env.JWT_SECRET || generateFallbackSecret('JWT_SECRET');
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || generateFallbackSecret('JWT_REFRESH_SECRET');
const adminJwtSecret = process.env.ADMIN_JWT_SECRET || (process.env.NODE_ENV === 'production' ? generateFallbackSecret('ADMIN_JWT_SECRET') : jwtSecret);
const adminSecret = process.env.ADMIN_SECRET || 'DinasariAdmin2026!';

// ── Production Secrets & Security Self-Check ────────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /REPLACE_WITH/i,
  /YOUR_/i,
  /placeholder/i,
  /change_in_production/i,
  /^dev_/i,
  /^test-/i,
];

const isPlaceholder = (val) => {
  if (!val || typeof val !== 'string') return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(val));
};

if (process.env.NODE_ENV === 'production') {
  const warnings = [];
  const errors = [];

  // Admin JWT secret isolation check
  if (process.env.ADMIN_JWT_SECRET && process.env.JWT_SECRET && process.env.ADMIN_JWT_SECRET === process.env.JWT_SECRET) {
    errors.push('❌ ADMIN_JWT_SECRET cannot be identical to JWT_SECRET in production mode.');
  }

  // Production Secrets Matrix
  const secrets = [
    { key: 'DATABASE_URL', name: 'Database Connection (PostgreSQL)' },
    { key: 'JWT_SECRET', name: 'JWT Auth Secret (min 64 chars)' },
    { key: 'JWT_REFRESH_SECRET', name: 'JWT Refresh Token Secret' },
    { key: 'ADMIN_SECRET', name: 'Admin Master Password' },
    { key: 'ADMIN_JWT_SECRET', name: 'Admin JWT Secret' },
    { key: 'FAST2SMS_API_KEY', name: 'Fast2SMS Gateway Key' },
    { key: 'RAZORPAY_KEY_ID', name: 'Razorpay Key ID' },
    { key: 'RAZORPAY_KEY_SECRET', name: 'Razorpay Key Secret' },
    { key: 'CLOUDINARY_CLOUD_NAME', name: 'Cloudinary Cloud Name' },
    { key: 'CLOUDINARY_API_KEY', name: 'Cloudinary API Key' },
    { key: 'CLOUDINARY_API_SECRET', name: 'Cloudinary API Secret' },
    { key: 'SENTRY_DSN', name: 'Sentry Crash Reporting DSN' },
  ];

  for (const { key, name } of secrets) {
    const val = process.env[key];
    if (val && isPlaceholder(val)) {
      if (process.env.JEST_WORKER_ID) {
        errors.push(`⚠️ ${key} (${name}) contains an unconfigured placeholder: "${val}"`);
      } else {
        warnings.push(`⚠️ ${key} (${name}) contains a placeholder value: "${val}"`);
      }
    } else if (!val || val.trim() === '') {
      warnings.push(`ℹ️ ${key} (${name}) is not set in environment (using safe fallback or optional mode).`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Production environment self-check failed with error(s):\n${errors.join('\n')}`);
  }

  if (warnings.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('ℹ️ DINASARI Production Environment Status:');
    warnings.forEach((w) => console.log(`  ${w}`));
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  } else {
    console.log('✅ Production environment self-check passed: All production secrets configured.');
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret,
  jwtRefreshSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  nodeEnv: process.env.NODE_ENV || 'development',
  // CORS: restrict to your domain in production via ALLOWED_ORIGIN env var
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  // Geofence: set GEOFENCE_ENABLED=true in production to enforce 100m radius check-in
  geofenceEnabled: process.env.GEOFENCE_ENABLED === 'true',
  // Trusted server base URL — used for building file URLs (never trust req.get('host'))
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  
  adminJwtSecret,
  adminSecret,
  // Cloudinary credentials
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  // Razorpay configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder_webhook_secret',
  },
};
