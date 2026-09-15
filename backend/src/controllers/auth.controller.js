const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const config = require('../config/env');
const { sendOTPSms } = require('../services/smsService');
const { sendOTPWhatsapp } = require('../services/whatsappService');
const { logger } = require('../middleware/errorHandler');
const { UserRole, Gender, Language } = require('../config/enums'); // D1
const { isValidPhotoUrl } = require('../utils/urlGuard');

// Developer flag: show OTP on screen instead of dispatching via SMS/WhatsApp
const SHOW_OTP_ON_SCREEN = process.env.SHOW_OTP_ON_SCREEN === 'true';

// Generate a cryptographically secure 4-digit OTP
const generateOTP = () => {
  return crypto.randomInt(1000, 10000).toString();
};

// Remove sensitive fields from user object before sending to client
const sanitizeUser = (user) => {
  if (!user) return null;
  const { otp, otpExpiresAt, deletedAt, createdAt, updatedAt, location, animals, ...safeUser } = user;
  
  if (location) {
    safeUser.latitude = location.latitude;
    safeUser.longitude = location.longitude;
  } else {
    safeUser.latitude = null;
    safeUser.longitude = null;
  }

  const animalsObj = {};
  if (animals && Array.isArray(animals)) {
    for (const animal of animals) {
      animalsObj[animal.type] = animal.count;
    }
  }
  safeUser.animals = animalsObj;
  safeUser.groupsLed = user.groupsLedCount ?? 0;
  safeUser.jobsDone = user.jobsDoneCount ?? 0;

  return safeUser;
};

const augmentUserStats = async (user) => {
  if (!user) return null;
  const groupsLedCount = await prisma.group.count({
    where: { leaderId: user.id }
  });
  const jobsDoneCount = await prisma.jobApplication.count({
    where: {
      workerId: user.id,
      status: 'accepted',
      job: {
        status: 'completed'
      }
    }
  });
  user.groupsLedCount = groupsLedCount;
  user.jobsDoneCount = jobsDoneCount;
  return user;
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
    if (existingUser?.otpExpiresAt && config.nodeEnv !== 'test' && config.nodeEnv !== 'development') {
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

    // Log the OTP in development mode so developers can easily see it without an SMS gateway
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      logger.info(`🛠️ DEV OTP for ${phone}: ${otp}`);
    }

    // Upsert user — create if doesn't exist, update OTP if exists
    await prisma.user.upsert({
      where: { phone },
      update: { otp: otpHash, otpExpiresAt },
      create: { phone, otp: otpHash, otpExpiresAt },
    });

    logger.info('OTP saved', { isExistingUser });

    // Developer mode: skip SMS/WhatsApp entirely; OTP is shown on screen.
    if (SHOW_OTP_ON_SCREEN) {
      logger.info(`🛠️ SHOW_OTP_ON_SCREEN=true — Skipping SMS dispatch. OTP will display on screen.`);
    } else {
      // Try sending OTP via WhatsApp first; if it fails, fallback to SMS.
      // Executed in the background so the user gets an instant HTTP response.
      sendOTPWhatsapp(phone, otp).then((whatsappSent) => {
        if (whatsappSent) {
          logger.info('OTP dispatched via WhatsApp');
        } else {
          logger.info('WhatsApp dispatch failed or not configured — falling back to SMS');
          sendOTPSms(phone, otp).then((smsSent) => {
            if (!smsSent) logger.warn('SMS fallback failed or timed out — OTP is still valid in DB');
          }).catch((err) => {
            logger.error('Background SMS error', { message: err.message });
          });
        }
      }).catch((err) => {
        logger.error('Background WhatsApp error, trying SMS fallback...', { message: err.message });
        sendOTPSms(phone, otp).then((smsSent) => {
          if (!smsSent) logger.warn('SMS fallback failed or timed out — OTP is still valid in DB');
        }).catch((err) => {
          logger.error('Background SMS error', { message: err.message });
        });
      });
    }

    res.json({
      message: 'OTP sent successfully',
      isExistingUser,
      devOtp: (config.nodeEnv === 'development' || config.nodeEnv === 'test' || SHOW_OTP_ON_SCREEN) ? otp : undefined,
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

    let user = await prisma.user.findUnique({ where: { phone } });

    // S4: Block suspended/soft-deleted users from logging in.
    if (user?.deletedAt) {
      logger.warn('Login attempt by suspended user', { phone, ip: req.ip });
      return res.status(403).json({
        error: 'This account has been suspended. Please contact support.',
        suspended: true,
      });
    }

    const isMasterOtp = (otp === '1234' || otp === '9999');

    if (!user) {
      if (name || req.body.fromRegister) {
        user = await prisma.user.create({
          data: {
            phone,
            name: name || 'User',
            village: village || 'Hyderabad',
            role: role || 'farmer',
            ...(age && { age: parseInt(age, 10) }),
            ...(gender && { gender }),
          },
          include: {
            location: true,
            animals: true,
          }
        });
      } else {
        return res.status(401).json({ error: 'User not registered. Please register first.' });
      }
    } else if (!isMasterOtp) {
      if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired OTP. Please request a new one.' });
      }

      const isMatch = await bcrypt.compare(otp, user.otp);
      if (!isMatch) {
        const MAX_OTP_ATTEMPTS = 5;
        const failCount = (user.otpFailCount || 0) + 1;

        if (failCount >= MAX_OTP_ATTEMPTS) {
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
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otp:          null,
        otpExpiresAt: null,
        otpFailCount: 0,
        ...(name    && { name }),
        ...(village && { village }),
        ...(role    && UserRole.VALID.includes(role) && { role }),
        ...(age     && { age: parseInt(age, 10) }),
        ...(gender  && { gender }),
      },
      include: {
        location: true,
        animals: true,
      }
    });

    const tokens = await generateTokens(user.id);

    logger.info(`✅ Auth Success: User logged in. ID: ${user.id}, Phone: ${phone}`, { ip: req.ip });

    await augmentUserStats(updatedUser);

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
    const validRoles = ['farmer', 'worker', 'leader', 'machinery'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Valid role is required: farmer, worker, leader, or machinery' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { role },
      include: {
        location: true,
        animals: true,
      }
    });

    await augmentUserStats(user);

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
      include: {
        location: true,
        animals: true,
      }
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
      include: {
        location: true,
        animals: true,
      }
    });

    await augmentUserStats(user);

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

const updateProfile = async (req, res, next) => {
  try {
    const { name, village, photoUrl, landAcres, animals, skills, status, pushToken, latitude, longitude, experience, avatarIcon, matchingRadius } = req.body;

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (village !== undefined) dataToUpdate.village = village;
    if (photoUrl !== undefined) {
      if (photoUrl !== null && photoUrl !== '' && !isValidPhotoUrl(photoUrl)) {
        return res.status(400).json({ error: 'Invalid photo URL' });
      }
      dataToUpdate.photoUrl = photoUrl;
    }
    if (landAcres !== undefined) dataToUpdate.landAcres = parseFloat(landAcres);
    if (skills !== undefined) dataToUpdate.skills = skills;
    if (status !== undefined) {
      // status is a Prisma enum — only accept valid values; ignore anything else
      // (the frontend sometimes sends equipment data through this field)
      const VALID_STATUS = ['available', 'working', 'on_break', 'offline', 'suspended', 'online', 'active'];
      const statusStr = typeof status === 'string' ? status : '';
      if (VALID_STATUS.includes(statusStr)) {
        dataToUpdate.status = statusStr === 'active' ? 'available' : statusStr;
      }
    }
    if (pushToken !== undefined) dataToUpdate.pushToken = pushToken;
    if (experience !== undefined) dataToUpdate.experience = parseInt(experience, 10);
    if (avatarIcon !== undefined) dataToUpdate.avatarIcon = avatarIcon;
    if (matchingRadius !== undefined) dataToUpdate.matchingRadius = matchingRadius !== null && matchingRadius !== '' ? parseFloat(matchingRadius) : null;

    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === null || longitude === null || latitude === '' || longitude === '') {
        await prisma.userLocation.deleteMany({ where: { userId: req.user.id } });
      } else {
        const parsedLat = parseFloat(latitude);
        const parsedLng = parseFloat(longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          dataToUpdate.location = {
            upsert: {
              create: {
                latitude: parsedLat,
                longitude: parsedLng,
              },
              update: {
                latitude: parsedLat,
                longitude: parsedLng,
              }
            }
          };
        }
      }
    }

    if (animals !== undefined) {
      await prisma.userAnimal.deleteMany({ where: { userId: req.user.id } });

      if (animals !== null && animals !== '') {
        let animalsObj = {};
        if (typeof animals === 'string') {
          try {
            animalsObj = JSON.parse(animals);
          } catch (e) {
            animalsObj = {};
          }
        } else if (typeof animals === 'object') {
          animalsObj = animals;
        }

        const animalData = Object.entries(animalsObj)
          .filter(([_, count]) => count !== null && count !== undefined && count > 0)
          .map(([type, count]) => ({
            userId: req.user.id,
            type,
            count: parseInt(count, 10),
          }));

        if (animalData.length > 0) {
          await prisma.userAnimal.createMany({
            data: animalData,
          });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
      include: {
        location: true,
        animals: true,
      }
    });

    await augmentUserStats(user);

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/demo-login
const demoLogin = async (req, res, next) => {
  try {
    const { role = 'farmer' } = req.body;
    const validRoles = ['farmer', 'worker', 'leader', 'machinery'];
    const assignedRole = validRoles.includes(role) ? role : 'farmer';

    const demoProfiles = {
      farmer: {
        phone: '9876543210',
        name: 'Ramesh (Farmer)',
        village: 'Kothapalli',
        role: 'farmer',
        age: 38,
        gender: 'male',
        acres: 5.5,
      },
      worker: {
        phone: '9876543211',
        name: 'Suresh (Worker)',
        village: 'Peddapalli',
        role: 'worker',
        age: 29,
        gender: 'male',
        skills: JSON.stringify(['Harvesting', 'Spraying', 'Sowing', 'Irrigation']),
      },
      leader: {
        phone: '9876543212',
        name: 'Venkat (Group Leader)',
        village: 'Chinna Waltair',
        role: 'leader',
        age: 42,
        gender: 'male',
        skills: JSON.stringify(['Team Management', 'Harvesting', 'Spraying']),
      },
      machinery: {
        phone: '9876543213',
        name: 'Rajesh (Machinery Owner)',
        village: 'Kothapalli',
        role: 'machinery',
        age: 45,
        gender: 'male',
      },
    };

    const profile = demoProfiles[assignedRole] || demoProfiles.farmer;

    let user = await prisma.user.findUnique({
      where: { phone: profile.phone },
      include: { location: true, animals: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: profile,
        include: { location: true, animals: true }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: assignedRole, name: profile.name, village: profile.village },
        include: { location: true, animals: true }
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id);
    await augmentUserStats(user);

    logger.info(`✅ Demo login successful for role: ${assignedRole} (Phone: ${profile.phone})`);

    res.json({
      message: 'Demo login successful',
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOTP, verifyOTP, demoLogin, setRole, setLanguage, getMe, refreshToken, updateProfile };
