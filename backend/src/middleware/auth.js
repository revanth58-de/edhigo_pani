const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/database');
const { logger } = require('./errorHandler');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      logger.warn('Auth failed: No token provided', { method: req.method, url: req.originalUrl, ip: req.ip });
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      logger.warn('Auth failed: User not found in database', { userId: decoded.userId, url: req.originalUrl, ip: req.ip });
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn('Auth failed: JWT verification error', { error: error.message, url: req.originalUrl, ip: req.ip });
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Required role: ' + roles.join(' or ') });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };
