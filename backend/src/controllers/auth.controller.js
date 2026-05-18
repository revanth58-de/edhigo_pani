const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const config = require('../config/env');
const { sendOTPSms } = require('../services/smsService');
const { logger } = require('../middleware/errorHandler');
const { UserRole, Gender, Language } = require('../config/enums'); // D1

// Generate a cryptographically secure 4-digit OTP
const generateOTP = () => {
  return crypto.randomInt(1000, 10000).toString();
};

// Remove sensitive fields from user object before sending to client
const sanitizeUser = (user) => {
  if (!user) return null;
  const { otp, otpExpiresAt, deletedAt, createdAt, updatedAt, ...safeUser } = user;
  return safeUser;
};

// Generate JWT tokens and save refresh token to DB
const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  const refreshToken = jwt.sign({ userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });

  // Calculate expiry for DB
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  // Save to DB
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

// POST /api/auth/send-otp
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    logger.info(`📞 OTP requested for phone: ${phone}`, { ip: req.ip });

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate 10-digit Indian mobile number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number. Must be a valid 10-digit Indian mobile number.' });
    }

    // Check if this phone is already a fully registered user
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    const isExistingUser = !!(existingUser?.name && existingUser?.role);

    // FIX #12: Per-phone OTP rate limit — prevent SMS flooding without Redis.
    // If an OTP was issued less than 2 minutes ago, reject the request.
    // The OTP TTL is already stored in otpExpiresAt; we check the inverse window.
    const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes
    if (existingUser?.otpExpiresAt && config.nodeEnv !== 'test') {
      const otpIssuedAt = new Date(existingUser.otpExpiresAt.getTime() - config.otpExpiryMinutes * 60 * 1000);
      const msSinceLastOtp = Date.now() - otpIssuedAt.getTime();
      if (msSinceLastOtp < OTP_RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - msSinceLastOtp) / 1000);
        logger.warn('OTP rate limit hit', { phone, waitSec });
        return res.status(429).json({
          error: `Please wait ${waitSec} seconds before requesting a new OTP.`,
          retryAfterSeconds: waitSec,
        });
      }
    }

    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    // OTP value intentionally NOT logged — devOtp field in response serves dev testing

    // Upsert user — create if doesn't exist, update OTP if exists
    await prisma.user.upsert({
      where: { phone },
      update: { otp: otpHash, otpExpiresAt },
      create: { phone, otp: otpHash, otpExpiresAt },
    });

    logger.info('OTP saved', { isExistingUser });

    // Send SMS in background — don't await so the client gets an instant response.
    // The OTP is already saved in the DB; SMS delivery is a side-effect only.
    sendOTPSms(phone, otp).then((smsSent) => {
      if (!smsSent) logger.warn('SMS failed or timed out — OTP is still valid in DB');
    }).catch((err) => {
      logger.error('Background SMS error', { message: err.message });
    });

    res.json({
      message: 'OTP sent successfully',
      isExistingUser,
      ...((config.nodeEnv === 'development' || config.nodeEnv === 'test') && { devOtp: otp }),
    });
  } catch (error) {
    logger.error('Send OTP error', { message: error.message }); // S3: use structured logger
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, name, village, role, age, gender } = req.body;

    logger.info('OTP verification attempt', { phone });

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    // S4: Block suspended/soft-deleted users from logging in.
    // If an admin set deletedAt, they should not be able to re-authenticate.
    if (user?.deletedAt) {
      logger.warn('Login attempt by suspended user', { phone, ip: req.ip });
      return res.status(403).json({
        error: 'This account has been suspended. Please contact support.',
        suspended: true,
      });
    }

    // SEC-4 FIX: Return the same error whether user is not found OR otp is wrong.
    // Never reveal whether a phone number is registered in this system.
    if (!user || !user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      // S3 FIX: Track consecutive OTP failures. After 5 wrong attempts,
      // invalidate the OTP so the attacker must request a fresh one.
      // This prevents brute-forcing a 4-digit OTP (10,000 combinations).
      const MAX_OTP_ATTEMPTS = 5;
      const failCount = (user.otpFailCount || 0) + 1;

      if (failCount >= MAX_OTP_ATTEMPTS) {
        // Wipe the OTP so they must call send-otp again
        await prisma.user.update({
          where: { id: user.id },
          data: { otp: null, otpExpiresAt: null, otpFailCount: 0 },
        });
        logger.warn('OTP brute force lockout triggered', { phone, attempts: failCount, ip: req.ip });
        return res.status(429).json({
          error: 'Too many incorrect attempts. Please request a new OTP.',
          locked: true,
        });
      }

      // Record the failure
      await prisma.user.update({
        where: { id: user.id },
        data: { otpFailCount: failCount },
      });

      logger.warn(`❌ Auth Failure: Invalid OTP (attempt ${failCount}/${MAX_OTP_ATTEMPTS}). Phone: ${phone}`, { ip: req.ip });
      return res.status(401).json({
        error: 'Invalid or expired OTP. Please request a new one.',
        attemptsRemaining: MAX_OTP_ATTEMPTS - failCount,
      });
    }

    // Clear OTP, reset fail counter, and optionally save registration data in one update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otp:          null,
        otpExpiresAt: null,
        otpFailCount: 0,  // S3: reset on success
        ...(name    && { name }),
        ...(village && { village }),
        ...(role    && UserRole.VALID.includes(role) && { role }),
        ...(age     && { age: parseInt(age, 10) }),
        ...(gender  && { gender }),
      },
    });

    const tokens = await generateTokens(user.id);

    logger.info(`✅ Auth Success: User logged in. ID: ${user.id}, Phone: ${phone}`, { ip: req.ip });

    res.json({
      message: 'OTP verified successfully',
      user: sanitizeUser(updatedUser),
      ...tokens,
    });

  } catch (error) {
    logger.error('OTP verification error', { message: error.message, code: error.code, meta: error.meta });
    next(error);
  }
};

// POST /api/auth/set-role
const setRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ['farmer', 'worker', 'leader'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required: farmer, worker, or leader' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { role },
    });

    res.json({
      message: 'Role set successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/language
const setLanguage = async (req, res, next) => {
  try {
    const { language } = req.body;
    const validLanguages = ['te', 'hi', 'en'];

    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Valid language is required: te, hi, or en' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { language },
    });

    res.json({
      message: 'Language updated',
      language: user.language,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh (with Rotation)
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: oldToken } = req.body;

    if (!oldToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // 1. Find token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: oldToken },
      include: { user: true },
    });

    // 2. Token reuse detection (Security Rotation)
    // If token exists but is already revoked, it means someone is reusing it.
    // In this case, we revoke ALL tokens for this user for security.
    if (!storedToken || storedToken.revoked) {
      if (storedToken) {
        await prisma.refreshToken.updateMany({
          where: { userId: storedToken.userId },
          data: { revoked: true },
        });
      }
      return res.status(401).json({ error: 'Invalid or reused refresh token. Please login again.' });
    }

    // 3. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(oldToken, config.jwtRefreshSecret);
    } catch (err) {
      // If token is invalid/expired, mark it as revoked
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    // 4. Revoke the old token (one-time use)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // 5. Issue new tokens
    const tokens = await generateTokens(storedToken.userId);
    res.json(tokens);
  } catch (error) {
    logger.error('Refresh token error', { message: error.message });
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, village, photoUrl, landAcres, animals, skills, status, pushToken, latitude, longitude, experience, avatarIcon } = req.body;

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (village !== undefined) dataToUpdate.village = village;
    if (photoUrl !== undefined) dataToUpdate.photoUrl = photoUrl;
    if (landAcres !== undefined) dataToUpdate.landAcres = parseFloat(landAcres);
    if (animals !== undefined) dataToUpdate.animals = animals;
    if (skills !== undefined) dataToUpdate.skills = skills;
    if (status !== undefined) dataToUpdate.status = status;
    if (pushToken !== undefined) dataToUpdate.pushToken = pushToken;
    if (latitude !== undefined) dataToUpdate.latitude = parseFloat(latitude);
    if (longitude !== undefined) dataToUpdate.longitude = parseFloat(longitude);
    if (experience !== undefined) dataToUpdate.experience = parseInt(experience, 10);
    if (avatarIcon !== undefined) dataToUpdate.avatarIcon = avatarIcon;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
    });

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOTP, verifyOTP, setRole, setLanguage, getMe, refreshToken, updateProfile };
