const { Expo } = require('expo-server-sdk');
const admin = require('firebase-admin');
const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

const expo = new Expo();

// ── Firebase Admin SDK Initialization (for Native FCM) ──────────────────────
let firebaseApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount;
    try {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (raw.startsWith('{')) {
        serviceAccount = JSON.parse(raw);
      } else {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      }
    } catch (parseErr) {
      logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON', { error: parseErr.message });
    }

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      logger.info('🔥 Firebase Admin initialized successfully for FCM');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    logger.info('🔥 Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS');
  }
} catch (err) {
  logger.warn('Firebase Admin initialization skipped/failed:', { message: err.message });
}

/**
 * Send FCM push notifications directly to native FCM registration tokens
 */
const sendDirectFCMPush = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseApp || !fcmTokens || fcmTokens.length === 0) return;
  try {
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    const payload = {
      notification: {
        title,
        body,
      },
      data: stringifiedData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          priority: 'max',
        },
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    logger.info('🔥 FCM Multicast Sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(fcmTokens[idx]);
          }
        }
      });
      if (invalidTokens.length > 0) {
        await prisma.user.updateMany({
          where: { pushToken: { in: invalidTokens } },
          data: { pushToken: null },
        });
        logger.info('Removed invalid FCM tokens from database', { count: invalidTokens.length });
      }
    }
  } catch (err) {
    logger.error('Direct FCM Push error', { message: err.message });
  }
};

/**
 * Clean up invalid/expired push tokens from the database.
 * Called after sending receipts — removes DeviceNotRegistered tokens
 * so we stop attempting to deliver to dead devices.
 */
const cleanupInvalidTokens = async (receiptIds) => {
  if (!receiptIds || receiptIds.length === 0) return;
  try {
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of receiptIdChunks) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
          // Null out the expired token so we never attempt it again
          if (receipt.to) {
            await prisma.user.updateMany({
              where: { pushToken: receipt.to },
              data: { pushToken: null },
            });
            logger.info('Removed expired push token', { token: receipt.to });
          }
        }
      }
    }
  } catch (err) {
    logger.error('Push receipt cleanup error', { message: err.message });
  }
};

/**
 * Send a push notification using Expo Push or Firebase Cloud Messaging (FCM)
 */
const sendPush = async (tokens, title, body, data = {}) => {
  try {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const validStrings = tokenList.filter((t) => typeof t === 'string' && t.trim().length > 0);

    if (validStrings.length === 0) {
      logger.info('No push tokens provided — skipping push notification');
      return;
    }

    const expoTokens = validStrings.filter((t) => Expo.isExpoPushToken(t));
    const fcmTokens = validStrings.filter((t) => !Expo.isExpoPushToken(t));

    // 1. Send via Expo Push Gateway
    if (expoTokens.length > 0) {
      const messages = expoTokens.map((to) => ({
        to,
        sound: 'default',
        title,
        body,
        data,
      }));

      const chunks = expo.chunkPushNotifications(messages);
      const receiptIds = [];

      for (let chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          logger.info('Expo Push chunk sent', { count: ticketChunk.length });
          ticketChunk.forEach((ticket) => {
            if (ticket.status === 'ok' && ticket.id) receiptIds.push(ticket.id);
          });
        } catch (error) {
          logger.error('Error sending Expo push notification chunk', { message: error.message });
        }
      }

      if (receiptIds.length > 0) {
        setTimeout(() => cleanupInvalidTokens(receiptIds), 15 * 60 * 1000);
      }
    }

    // 2. Send via direct Firebase Cloud Messaging (FCM)
    if (fcmTokens.length > 0) {
      await sendDirectFCMPush(fcmTokens, title, body, data);
    }
  } catch (err) {
    logger.error('Push notification setup error', { message: err.message });
  }
};

/**
 * Send an array of personalized push messages (Expo + FCM)
 */
const sendPushMessages = async (messages) => {
  try {
    if (!messages || messages.length === 0) return;

    const expoMessages = [];
    const fcmMessages = [];

    messages.forEach((msg) => {
      if (msg.to && typeof msg.to === 'string') {
        if (Expo.isExpoPushToken(msg.to)) {
          expoMessages.push(msg);
        } else {
          fcmMessages.push(msg);
        }
      }
    });

    // 1. Send Expo messages in chunks
    if (expoMessages.length > 0) {
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (let chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          logger.error('Error sending custom Expo push chunk', { message: err.message });
        }
      }
    }

    // 2. Send FCM messages
    for (const fcmMsg of fcmMessages) {
      await sendDirectFCMPush([fcmMsg.to], fcmMsg.title, fcmMsg.body, fcmMsg.data || {});
    }
  } catch (err) {
    logger.error('Push notification batch setup error', { message: err.message });
  }
};

/**
 * Helper to write a notification history record to the database
 */
const createNotification = async (userId, title, body, data = {}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        data: data ? JSON.parse(JSON.stringify(data)) : null,
      },
    });

    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        io.to(`user:${userId}`).emit('notification:new', notification);
        logger.info(`📡 Socket notification:new emitted to user:${userId}`);
      }
    } catch (socketErr) {
      logger.error('Socket emission error during notification creation', { message: socketErr.message });
    }

    return notification;
  } catch (err) {
    logger.error('Error creating database notification', { message: err.message });
    return null;
  }
};

/**
 * Notify workers about a new job offer (personalized with distance)
 */
const notifyWorkersNewJob = async (workers, job) => {
  const messages = [];

  for (const worker of workers) {
    if (worker.id) {
      await createNotification(
        worker.id,
        '🌾 New Job Available!',
        `${job.workType} work · ₹${job.payPerDay}/day`,
        { jobId: job.id, screen: 'JobOffer' }
      );
    }

    if (worker.pushToken) {
      const distText = worker.distanceKm ? `${worker.distanceKm} km away` : 'Near you';
      messages.push({
        to: worker.pushToken,
        sound: 'default',
        title: '🌾 New Job Available!',
        body: `${job.workType} work · ₹${job.payPerDay}/day · ${distText}`,
        data: { jobId: job.id, screen: 'JobOffer' }
      });
    }
  }

  await sendPushMessages(messages);
};

/**
 * Notify farmer that a worker accepted their job
 */
const notifyFarmerJobAccepted = async (farmerId, farmerToken, worker, job) => {
  if (farmerId) {
    await createNotification(
      farmerId,
      '✅ Worker Accepted Your Job!',
      `${worker.name || 'A worker'} accepted your ${job.workType} job. Tap to view.`,
      { jobId: job.id, screen: 'RequestAccepted' }
    );
  }
  if (farmerToken) {
    await sendPush(
      farmerToken,
      '✅ Worker Accepted Your Job!',
      `${worker.name || 'A worker'} accepted your ${job.workType} job. Tap to view.`,
      { jobId: job.id, screen: 'RequestAccepted' }
    );
  }
};

/**
 * Notify worker that their application was rejected
 */
const notifyWorkerJobRejected = async (workerId, workerToken, job) => {
  if (workerId) {
    await createNotification(
      workerId,
      '❌ Job Application Rejected',
      `Your application for ${job.workType} was not selected this time.`,
      { jobId: job.id }
    );
  }
  if (workerToken) {
    await sendPush(
      workerToken,
      '❌ Job Application Rejected',
      `Your application for ${job.workType} was not selected this time.`,
      { jobId: job.id }
    );
  }
};

/**
 * Notify farmer that worker withdrew from accepted job
 */
const notifyFarmerJobWithdrawn = async (farmerId, farmerToken, job) => {
  if (farmerId) {
    await createNotification(
      farmerId,
      '⚠️ Worker Cancelled',
      `The worker cancelled your ${job.workType} job. It has been re-opened to others.`,
      { jobId: job.id }
    );
  }
  if (farmerToken) {
    await sendPush(
      farmerToken,
      '⚠️ Worker Cancelled',
      `The worker cancelled your ${job.workType} job. It has been re-opened to others.`,
      { jobId: job.id }
    );
  }
};

/**
 * Notify worker that job is cancelled by farmer
 */
const notifyWorkerJobCancelled = async (workerIds, workerTokens, job) => {
  const ids = Array.isArray(workerIds) ? workerIds : (workerIds ? [workerIds] : []);
  for (const workerId of ids) {
    await createNotification(
      workerId,
      '❌ Job Cancelled',
      `The farmer has cancelled the ${job.workType} job.`,
      { jobId: job.id }
    );
  }

  if (workerTokens) {
    await sendPush(
      workerTokens,
      '❌ Job Cancelled',
      `The farmer has cancelled the ${job.workType} job.`,
      { jobId: job.id }
    );
  }
};

/**
 * Notify farmer of attendance check-in
 */
const notifyFarmerAttendanceIn = async (farmerId, farmerToken, worker, job) => {
  if (farmerId) {
    await createNotification(
      farmerId,
      '📍 Worker Arrived',
      `${worker.name || 'A worker'} has scanned in and started working.`,
      { jobId: job.id, screen: 'WorkInProgress' }
    );
  }
  if (farmerToken) {
    await sendPush(
      farmerToken,
      '📍 Worker Arrived',
      `${worker.name || 'A worker'} has scanned in and started working.`,
      { jobId: job.id, screen: 'WorkInProgress' }
    );
  }
};

/**
 * Notify farmer of attendance check-out
 */
const notifyFarmerAttendanceOut = async (farmerId, farmerToken, worker, job, hours) => {
  if (farmerId) {
    await createNotification(
      farmerId,
      '✅ Worker Finished',
      `${worker.name || 'A worker'} has scanned out after ${hours.toFixed(1)} hours.`,
      { jobId: job.id, screen: 'Payment' }
    );
  }
  if (farmerToken) {
    await sendPush(
      farmerToken,
      '✅ Worker Finished',
      `${worker.name || 'A worker'} has scanned out after ${hours.toFixed(1)} hours.`,
      { jobId: job.id, screen: 'Payment' }
    );
  }
};

/**
 * Notify farmer of worker arrival at farm boundary
 */
const notifyFarmerWorkerArrived = async (farmerId, farmerToken, worker, job) => {
  if (farmerId) {
    await createNotification(
      farmerId,
      '🔔 Worker Arriving',
      `${worker?.name || 'A worker'} has arrived at your farm for the ${job.workType} job.`,
      { jobId: job.id, screen: 'ArrivalAlert' }
    );
  }
  if (farmerToken) {
    await sendPush(
      farmerToken,
      '🔔 Worker Arriving',
      `${worker?.name || 'A worker'} has arrived at your farm for the ${job.workType} job.`,
      { jobId: job.id, screen: 'ArrivalAlert' }
    );
  }
};

module.exports = {
  sendPush,
  createNotification,
  notifyWorkersNewJob,
  notifyFarmerJobAccepted,
  notifyWorkerJobRejected,
  notifyFarmerJobWithdrawn,
  notifyWorkerJobCancelled,
  notifyFarmerAttendanceIn,
  notifyFarmerAttendanceOut,
  notifyFarmerWorkerArrived,
};
