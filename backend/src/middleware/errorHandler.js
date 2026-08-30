const winston = require('winston');
const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const asyncLocalStorage = new AsyncLocalStorage();

// Custom Winston format to inject request ID from context
const requestIdFormat = typeof winston.format === 'function' ? winston.format((info) => {
  const store = asyncLocalStorage.getStore();
  if (store && store.requestId) {
    info.requestId = store.requestId;
  }
  return info;
}) : () => ({});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    requestIdFormat(),
    winston.format.json()
  ),
  transports: [
    // Write all logs with level 'error' and below to 'logs/error.log'
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with level 'info' and below to 'logs/combined.log'
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

if (process.env.GCP_PROJECT_ID) {
  const { LoggingWinston } = require('@google-cloud/logging-winston');
  const loggingWinston = new LoggingWinston({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE || undefined,
  });
  logger.add(loggingWinston);
}

// Request trace middleware to generate request IDs and bind AsyncLocalStorage context
const traceMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  asyncLocalStorage.run({ requestId }, () => {
    next();
  });
};

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
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  res.status(status).json({
    success: false,
    error: isDevOrTest ? err.message : (status === 500 ? 'Internal server error' : err.message),
  });
};

module.exports = { errorHandler, logger, traceMiddleware, asyncLocalStorage };
