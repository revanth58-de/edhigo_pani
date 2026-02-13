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

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);

    // Upsert user — create if doesn't exist, update OTP if exists
    const user = await prisma.user.upsert({
      where: { phone },
      update: { otp, otpExpiresAt },
      create: { phone, otp, otpExpiresAt },
    });

    // ON-SCREEN OTP: Return the OTP directly (no SMS cost!)
    // In production, you'd show it on a separate verification screen
    res.json({
      message: 'OTP generated successfully',
      otp: otp, // Displayed on-screen to the user
      expiresIn: config.otpExpiryMinutes * 60, // seconds
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(401).json({ error: 'OTP expired' });
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: { otp: null, otpExpiresAt: null },
    });

    const tokens = generateTokens(user.id);

    res.json({
      message: 'OTP verified successfully',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        language: user.language,
      },
      ...tokens,
    });
  } catch (error) {
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
