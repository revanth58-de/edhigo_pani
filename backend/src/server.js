const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const config = require('./config/env');
const { errorHandler, logger } = require('./middleware/errorHandler');
const { setIO } = require('./config/socket');

// Import routes
const authRoutes = require('./routes/auth.routes');
const jobsRoutes = require('./routes/jobs.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const ratingsRoutes = require('./routes/ratings.routes');
const paymentRoutes = require('./routes/payment.routes');
const groupRoutes = require('./routes/group.routes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ───
// CORS must be before helmet so preflight requests work
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false, // Disable CSP in development
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/groups', groupRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Socket.io ───
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Location updates from workers
  socket.on('location:update', (data) => {
    // Broadcast to relevant farmer/leader
    socket.broadcast.emit('location:broadcast', {
      userId: data.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  // Join a job room for real-time updates
  socket.on('job:join', (jobId) => {
    socket.join(`job:${jobId}`);
    logger.info(`Socket ${socket.id} joined job:${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);
setIO(io);

// ─── Error Handler (must be last) ───
app.use(errorHandler);

// ─── Start Server ───
server.listen(config.port, () => {
  logger.info(`🚀 FarmConnect server running on port ${config.port}`);
  logger.info(`📡 Environment: ${config.nodeEnv}`);
});

module.exports = { app, server, io };
