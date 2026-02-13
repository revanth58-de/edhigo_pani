const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  sendOTP,
  verifyOTP,
  setRole,
  setLanguage,
  getMe,
  refreshToken,
  updateProfile,
} = require('../controllers/auth.controller');

// Public routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/refresh', refreshToken);

// Protected routes (require JWT)
router.post('/set-role', authenticate, setRole);
router.put('/language', authenticate, setLanguage);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
