const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter, uploadLimiter } = require('./middleware/rateLimiter');
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
const uploadRoutes = require('./routes/upload.routes');
const adminRoutes = require('./routes/admin.routes');
const workerRoutes = require('./routes/worker.routes');
const chatRoutes = require('./routes/chat.routes');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,   // 30s — wait longer before declaring client gone
  pingInterval: 10000,  // 10s — ping every 10s to detect real disconnects faster
});

// ─── Middleware ───
// CORS must be before helmet so preflight requests work
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder', 'x-admin-secret'],
}));

// Explicit preflight handler for all routes (ensures tunnel proxies don't strip headers)
app.options('{*path}', cors());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false, // Disable CSP in development
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───
// General fallback: 60 req/min. Auth routes have stricter limits applied in auth.routes.js.
app.use('/api/', apiLimiter);

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/chats', chatRoutes);

// Serve admin dashboard static files
app.use('/admin', express.static(path.join(__dirname, '../../admin')));

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

  // Join a personal user room for notifications (cancellations, etc.)
  socket.on('user:join', (userId) => {
    socket.join(`user:${userId}`);
    logger.info(`Socket ${socket.id} joined user:${userId}`);
  });

  // ─── Group Chat ───
  socket.on('group:join', (groupId) => {
    socket.join(`group:${groupId}`);
    logger.info(`Socket ${socket.id} joined group:${groupId}`);
  });

  socket.on('group:message', async (data) => {
    // Expected args: groupId, content, token
    const { groupId, content, token } = data;
    try {
      const jwt = require('jsonwebtoken');
      const prisma = require('./config/database');
      
      if (!token) throw new Error('No auth token provided for message');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const senderId = decoded.userId;
      
      const message = await prisma.groupMessage.create({
        data: {
          content,
          group: { connect: { id: groupId } },
          sender: { connect: { id: senderId } }
        },
        include: {
          sender: { select: { id: true, name: true, photoUrl: true, role: true } }
        }
      });

      // Broadcast to everyone in the room
      io.to(`group:${groupId}`).emit('group:message', message);
    } catch (err) {
      logger.error(`Error saving/sending group message: ${err.message}`);
    }
  });

  // Worker arrives at farm
  socket.on('job:arrival', async (data) => {
    const { jobId, workerId } = data;
    logger.info(`🏁 Worker ${workerId} arrived for job:${jobId}`);
    io.to(`job:${jobId}`).emit('job:arrival', { workerId, jobId });

    try {
      const prisma = require('./config/database');
      const { notifyFarmerWorkerArrived } = require('./services/pushNotification');

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { farmer: { select: { pushToken: true } } }
      });
      const worker = await prisma.user.findUnique({ where: { id: workerId }, select: { name: true } });

      if (job?.farmer?.pushToken) {
        await notifyFarmerWorkerArrived(job.farmer.pushToken, worker, job);
      }
    } catch (err) {
      logger.error(`Error sending arrival push notification: ${err.message}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });

  // Farmer ends work — notify all workers to open checkout QR scanner
  socket.on('work:done', async (data) => {
    const { jobId } = data;
    logger.info(`🏁 Farmer ended work for job:${jobId}`);

    try {
      const prisma = require('./config/database');
      // Find all accepted workers for this job
      const applications = await prisma.jobApplication.findMany({
        where: { jobId, status: 'accepted' },
        select: { workerId: true },
      });

      // Emit to each worker's personal room
      applications.forEach(({ workerId }) => {
        io.to(`user:${workerId}`).emit('work:done', { jobId });
        logger.info(`📡 work:done → worker user:${workerId}`);
      });
    } catch (err) {
      logger.error(`Error broadcasting work:done: ${err.message}`);
    }
  });
});

// Make io accessible to routes
app.set('io', io);
setIO(io);

// ─── Error Handler (must be last) ───
app.use(errorHandler);

// ─── Start Server ───
if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`🚀 FarmConnect server running on port ${config.port} (bound to 0.0.0.0)`);
    logger.info(`📡 Environment: ${config.nodeEnv}`);
  });
}

module.exports = { app, server, io };
