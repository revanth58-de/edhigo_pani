require('dotenv').config();

// ── Fail fast on missing required secrets ────────────────────────────────
// If these are undefined, ALL auth will silently break — crash immediately instead.
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET missing in environment!');
  throw new Error('FATAL: JWT_SECRET is not set in environment variables. Check your .env file.');
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_REFRESH_SECRET missing in environment!');
  throw new Error('FATAL: JWT_REFRESH_SECRET is not set in environment variables. Check your .env file.');
}

// ── Warn if default/placeholder secrets are used in production ───────────
const PLACEHOLDER_SECRETS = [
  'farmconnect_super_secret_key_change_in_production',
  'farmconnect_refresh_secret_change_in_production',
  'REPLACE_WITH_64_CHAR_RANDOM_STRING',
  'REPLACE_WITH_DIFFERENT_64_CHAR_RANDOM_STRING',
];

if (process.env.NODE_ENV === 'production') {
  if (
    PLACEHOLDER_SECRETS.includes(process.env.JWT_SECRET) ||
    PLACEHOLDER_SECRETS.includes(process.env.JWT_REFRESH_SECRET)
  ) {
    console.error('🚨 CRITICAL SECURITY WARNING: You are using default/placeholder JWT secrets in production!');
    throw new Error('FATAL: Replace JWT_SECRET and JWT_REFRESH_SECRET with strong random values before deployment.');
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
};
