require("dotenv").config();

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

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  nodeEnv: process.env.NODE_ENV || "development",
};
