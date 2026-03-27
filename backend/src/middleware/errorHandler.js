const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  
  // Log the error with forensic metadata
  logger.error({
    message: err.message,
    status: status,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
 
  // Handle specific Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this data already exists' });
  }

  // Final response — never leak stack trace in production
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : (status === 500 ? 'Internal server error' : err.message),
  });
};

module.exports = { errorHandler, logger };
