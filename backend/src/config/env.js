require('dotenv').config();

// ── Fail fast on missing required secrets in any environment ────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET missing in environment!');
  throw new Error('FATAL: JWT_SECRET is not set in environment variables. Check your .env file.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_REFRESH_SECRET missing in environment!');
  throw new Error('FATAL: JWT_REFRESH_SECRET is not set in environment variables. Check your .env file.');
}

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
  const validationErrors = [];

  // Required Production Secrets Matrix
  const requiredSecrets = [
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

  for (const { key, name } of requiredSecrets) {
    const val = process.env[key];
    if (!val || val.trim() === '') {
      validationErrors.push(`❌ ${key} (${name}) is MISSING in environment`);
    } else if (isPlaceholder(val)) {
      validationErrors.push(`⚠️ ${key} (${name}) contains an unconfigured placeholder: "${val}"`);
    }
  }

  // Database URL sanity check: SQLite is strictly forbidden in production
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.startsWith('file:') || process.env.DATABASE_URL.includes('.db')) {
      validationErrors.push('❌ DATABASE_URL is configured for SQLite ("file:..."). Production requires a PostgreSQL connection string.');
    }
  }

  // Admin JWT secret isolation check
  if (process.env.ADMIN_JWT_SECRET && process.env.JWT_SECRET) {
    if (process.env.ADMIN_JWT_SECRET === process.env.JWT_SECRET) {
      validationErrors.push('❌ ADMIN_JWT_SECRET cannot be identical to JWT_SECRET in production mode.');
    }
  }

  // CORS warning check
  if (!process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGIN === '*') {
    console.warn('⚠️ SECURITY WARNING: ALLOWED_ORIGIN is set to wildcard "*" or empty in production. Set to https://www.dinasari.co.in.');
  }

  // Geofencing verification
  if (process.env.GEOFENCE_ENABLED !== 'true') {
    console.warn('⚠️ SECURITY WARNING: GEOFENCE_ENABLED is not set to "true" in production! QR check-in/out will NOT enforce 100m GPS proximity verification.');
  }

  if (validationErrors.length > 0) {
    console.error('\n═══════════════════════════════════════════════════════════════════════════════');
    console.error('🚨 FATAL: Production Environment Configuration Self-Check Failed!');
    console.error('The server cannot start in production mode with missing or placeholder secrets.');
    console.error('═══════════════════════════════════════════════════════════════════════════════');
    validationErrors.forEach((err) => console.error(`  ${err}`));
    console.error('═══════════════════════════════════════════════════════════════════════════════\n');

    const errMessage = `FATAL: Production environment self-check failed with ${validationErrors.length} error(s):\n${validationErrors.join('\n')}`;
    
    // In actual production runtime, terminate the process immediately.
    // In test runner context, throw Error so Jest can assert on error conditions.
    if (process.env.NODE_ENV === 'production' && !process.env.JEST_WORKER_ID) {
      process.exit(1);
    }
    throw new Error(errMessage);
  } else {
    console.log('✅ Production environment self-check passed: All 12 production secrets & configurations validated.');
  }
}

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
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
  
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : process.env.JWT_SECRET),
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
  },
};
