const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/env');

// Generate a 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  const refreshToken = jwt.sign({ userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/send-otp
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    console.log('📞 Send OTP Request for phone:', phone);

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if this phone is already a fully registered user
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    const isExistingUser = !!(existingUser?.name && existingUser?.role);

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    console.log('🔑 Generated OTP:', { otp, expiresAt: otpExpiresAt });

    // Upsert user — create if doesn't exist, update OTP if exists
    await prisma.user.upsert({
      where: { phone },
      update: { otp, otpExpiresAt },
      create: { phone, otp, otpExpiresAt },
    });

    console.log('✅ OTP saved. isExistingUser:', isExistingUser);

    res.json({
      message: 'OTP generated successfully',
      otp: otp,
      isExistingUser,           // <-- frontend can use this to detect existing users
      expiresIn: config.otpExpiryMinutes * 60,
    });
  } catch (error) {
    console.error('💥 Send OTP Error:', error);
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp, name, village, role } = req.body;

    console.log('🔐 OTP Verification Request:', { phone, otp });

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      console.log('❌ User not found for phone:', phone);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('📱 User found:', {
      id: user.id,
      phone: user.phone,
      storedOTP: user.otp,
      receivedOTP: otp,
      otpExpiresAt: user.otpExpiresAt
    });

    if (user.otp !== otp) {
      console.log('❌ OTP Mismatch:', { stored: user.otp, received: otp });
      return res.status(401).json({
        error: 'Invalid OTP',
        debug: { expected: user.otp, received: otp } // For development only
      });
    }

    if (user.otpExpiresAt < new Date()) {
      console.log('❌ OTP Expired:', { expiresAt: user.otpExpiresAt, now: new Date() });
      return res.status(401).json({ error: 'OTP expired' });
    }

    // Clear OTP and optionally save registration data in one update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
        ...(name && { name }),
        ...(village && { village }),
        ...(role && ['farmer', 'worker', 'leader'].includes(role) && { role }),
      },
    });

    const tokens = generateTokens(user.id);

    console.log('✅ OTP Verified Successfully for user:', user.id);

    res.json({
      message: 'OTP verified successfully',
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        role: updatedUser.role,
        village: updatedUser.village,
        language: updatedUser.language,
        photoUrl: updatedUser.photoUrl,
        landAcres: updatedUser.landAcres,
        animals: updatedUser.animals,
        skills: updatedUser.skills,
        ratingAvg: updatedUser.ratingAvg,
        ratingCount: updatedUser.ratingCount,
        status: updatedUser.status,
      },
      ...tokens,
    });

  } catch (error) {
    console.error('💥 OTP Verification Error:', error);
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
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        language: user.language,
      },
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
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        language: user.language,
        village: user.village,
        photoUrl: user.photoUrl,
        landAcres: user.landAcres,
        animals: user.animals,
        skills: user.skills,
        ratingAvg: user.ratingAvg,
        ratingCount: user.ratingCount,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user.id);
    res.json(tokens);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, village, photoUrl, landAcres, animals, skills, status } = req.body;

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (village !== undefined) dataToUpdate.village = village;
    if (photoUrl !== undefined) dataToUpdate.photoUrl = photoUrl;
    if (landAcres !== undefined) dataToUpdate.landAcres = parseFloat(landAcres);
    if (animals !== undefined) dataToUpdate.animals = animals;
    if (skills !== undefined) dataToUpdate.skills = skills;
    if (status !== undefined) dataToUpdate.status = status;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: dataToUpdate,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        language: user.language,
        village: user.village,
        photoUrl: user.photoUrl,
        landAcres: user.landAcres,
        animals: user.animals,
        skills: user.skills,
        ratingAvg: user.ratingAvg,
        ratingCount: user.ratingCount,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendOTP, verifyOTP, setRole, setLanguage, getMe, refreshToken, updateProfile };
