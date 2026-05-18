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

const Sentry = require('@sentry/node');
// NOTE: @sentry/profiling-node is excluded — it requires a native binary that
// is not yet available for Node.js v24. Error monitoring still works fully.
// Re-enable once https://github.com/getsentry/sentry-javascript/issues ships a v24 build.

// Initialize Sentry crash reporting
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.NODE_ENV || 'development',
  });
}

// Initialize Express
const app = express();


// Trust proxy for correct IP detection behind Nginx/Load Balancers
app.set('trust proxy', 1);

// FIX #18: Health check endpoint — required by Cloud Run, Kubernetes, and load
// balancers to verify the service is alive before routing traffic to it.
// Must be registered BEFORE the rate limiter to avoid throttling infra checks.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,   // 30s — wait longer before declaring client gone
  pingInterval: 10000,  // 10s — ping every 10s to detect real disconnects faster
});

// ─── Middleware ───
// Enforce HTTPS in production
if (config.nodeEnv === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// CORS must be before helmet so preflight requests work
app.use(cors({
  origin: config.allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'bypass-tunnel-reminder', 'x-admin-secret'],
}));

// Explicit preflight handler for all routes (ensures tunnel proxies don't strip headers)
app.options('{*path}', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
// Body size limit prevents memory-exhaustion attacks (SEC body limit fix)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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
// SEC-2 FIX: Authenticate every socket connection before allowing room joins.
// This prevents unauthenticated clients from spying on private user rooms.
const jwt = require('jsonwebtoken');
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication required for socket connection'));
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.userId; // Attach verified userId to socket for use in handlers
    next();
  } catch (err) {
    return next(new Error('Invalid or expired socket token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

  // Location updates from workers — emit ONLY to the relevant farmer's room
  // data must include: { userId, farmerId, latitude, longitude }
  socket.on('location:update', (data) => {
    if (!data.farmerId) {
      // Fallback: if no farmerId provided, only broadcast to job room
      if (data.jobId) {
        io.to(`job:${data.jobId}`).emit('location:broadcast', {
          userId: data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }
    // Targeted emit — only the farmer whose userId matches receives this
    io.to(`user:${data.farmerId}`).emit('location:broadcast', {
      userId: data.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date().toISOString(),
    });
  });

  // S1 FIX: Verify job membership before joining the job room.
  // Only the job's farmer or an applicant/worker can receive job events.
  socket.on('job:join', async (jobId) => {
    try {
      const prisma = require('./config/database');
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: {
          farmerId: true,
          applications: { where: { workerId: socket.userId }, select: { id: true } },
          attendances:  { where: { workerId: socket.userId }, select: { id: true } },
        },
      });
      if (!job) return; // Job doesn't exist — silently ignore

      const isFarmer    = job.farmerId === socket.userId;
      const hasApplied  = job.applications.length > 0;
      const hasAttended = job.attendances.length > 0;

      if (!isFarmer && !hasApplied && !hasAttended) {
        logger.warn(`Socket ${socket.id} tried to join job:${jobId} without authorization`);
        return; // Silently reject
      }
      socket.join(`job:${jobId}`);
      logger.info(`Socket ${socket.id} joined job:${jobId}`);
    } catch (err) {
      logger.error(`job:join error: ${err.message}`);
    }
  });

  // Join a personal user room for notifications
  // SEC-2 FIX: Only allow a user to join THEIR OWN room — verified against JWT identity
  socket.on('user:join', (userId) => {
    if (userId !== socket.userId) {
      logger.warn(`Socket ${socket.id} tried to join user:${userId} but is authenticated as ${socket.userId}`);
      return; // Silently reject — no error to avoid leaking info
    }
    socket.join(`user:${userId}`);
    logger.info(`Socket ${socket.id} joined user:${userId}`);
  });

  // ─── Group Chat ───
  // S1 FIX: Verify group membership before allowing socket to join the group room.
  // Without this, any authenticated user could join any group's chat.
  socket.on('group:join', async (groupId) => {
    try {
      const prisma = require('./config/database');
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { leaderId: true, members: { where: { workerId: socket.userId }, select: { id: true } } },
      });
      if (!group) return; // Group doesn't exist — silently ignore
      const isLeader = group.leaderId === socket.userId;
      const isMember = group.members.length > 0;
      if (!isLeader && !isMember) {
        logger.warn(`Socket ${socket.id} tried to join group:${groupId} but is not a member`);
        return; // Silently reject — no error to avoid leaking group existence
      }
      socket.join(`group:${groupId}`);
      logger.info(`Socket ${socket.id} joined group:${groupId}`);
    } catch (err) {
      logger.error(`group:join error: ${err.message}`);
    }
  });

  socket.on('group:message', async (data) => {
    const { groupId, content } = data;
    // S1 FIX: Use socket.userId (verified at connection) instead of re-verifying a token.
    // The io.use() middleware already validated the JWT before this handler runs.
    const senderId = socket.userId;
    try {
      const prisma = require('./config/database');

      // Verify sender is actually in this group before persisting the message
      const membership = await prisma.group.findFirst({
        where: {
          id: groupId,
          OR: [{ leaderId: senderId }, { members: { some: { workerId: senderId } } }],
        },
        select: { id: true },
      });
      if (!membership) {
        logger.warn(`Socket ${socket.id} tried to message group:${groupId} without membership`);
        return;
      }

      const message = await prisma.groupMessage.create({
        data: {
          content,
          group: { connect: { id: groupId } },
          sender: { connect: { id: senderId } },
        },
        include: {
          sender: { select: { id: true, name: true, photoUrl: true, role: true } },
        },
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
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

// ─── Start Server ───
if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`🚀 DINASARI server running on port ${config.port} (bound to 0.0.0.0)`);
    logger.info(`📡 Environment: ${config.nodeEnv}`);
  });

  // ─── Refresh Token Cleanup Job ─────────────────────────────────────────
  // Runs once every 24 hours to purge revoked/expired tokens from the DB.
  // Prevents unbounded table growth as users log in and out over time.
  const prisma = require('./config/database');
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  const runTokenCleanup = async () => {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { revoked: true },
            { expiresAt: { lt: new Date() } },
          ],
        },
      });
      if (result.count > 0) {
        logger.info(`🧹 Token cleanup: removed ${result.count} expired/revoked refresh tokens`);
      }
    } catch (err) {
      logger.error('Token cleanup job failed', { message: err.message });
    }
  };
  // Run once immediately on startup, then every 24 hours
  runTokenCleanup();
  setInterval(runTokenCleanup, CLEANUP_INTERVAL);

  // ─── B9: Worker Status Heartbeat Cleanup ───────────────────────────────
  // Runs every 1 minute to auto-set workers to 'offline' if they haven't
  // updated their location/status (updatedAt) in the last 10 minutes.
  const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute
  const TEN_MINUTES_AGO = 10 * 60 * 1000;
  const runWorkerHeartbeat = async () => {
    try {
      const cutoffTime = new Date(Date.now() - TEN_MINUTES_AGO);
      const result = await prisma.user.updateMany({
        where: {
          role: 'worker',
          status: 'available',
          updatedAt: { lt: cutoffTime },
        },
        data: {
          status: 'offline',
        },
      });
      if (result.count > 0) {
        logger.info(`💓 Heartbeat: auto-set ${result.count} inactive workers to offline`);
      }
    } catch (err) {
      logger.error('Worker heartbeat job failed', { message: err.message });
    }
  };
  setInterval(runWorkerHeartbeat, HEARTBEAT_INTERVAL);

  // ─── Graceful Shutdown ──────────────────────────────────────────────────
  // Ensures active requests complete and DB connections are closed cleanly
  // when the process is stopped (e.g., during a production deploy).
  const shutdown = (signal) => {
    logger.info(`${signal} received — gracefully shutting down...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
      } catch (err) {
        logger.error('Error disconnecting database', { message: err.message });
      }
      process.exit(0);
    });

    // Force shutdown after 10 seconds if graceful close takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after 10s timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

module.exports = { app, server, io };
