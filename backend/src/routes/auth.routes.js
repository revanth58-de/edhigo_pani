const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  sendOTP,
  verifyOTP,
  setRole,
  setLanguage,
  getMe,
  refreshToken,
  updateProfile,
} = require('../controllers/auth.controller');

// Public routes — strict rate limit to prevent OTP spam & brute-force
router.post('/send-otp', otpLimiter, sendOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh', authLimiter, refreshToken);


// Protected routes (require JWT)
router.post('/set-role', authenticate, setRole);
router.put('/language', authenticate, setLanguage);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
