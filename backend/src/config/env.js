require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  nodeEnv: process.env.NODE_ENV || "development",
};
