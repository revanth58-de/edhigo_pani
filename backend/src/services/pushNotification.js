const { Expo } = require('expo-server-sdk');
const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');

const expo = new Expo();

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
 * Send a push notification using the official Expo SDK
 */
const sendPush = async (tokens, title, body, data = {}) => {
  try {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const validTokens = tokenList.filter((t) => typeof t === 'string' && Expo.isExpoPushToken(t));

    if (validTokens.length === 0) {
      logger.info('No valid push tokens — skipping notification');
      return;
    }

    const messages = validTokens.map((to) => ({
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
        logger.info('Push chunk sent', { count: ticketChunk.length });
        // Collect receipt IDs from successful tickets for later validation
        ticketChunk.forEach((ticket) => {
          if (ticket.status === 'ok' && ticket.id) receiptIds.push(ticket.id);
        });
      } catch (error) {
        logger.error('Error sending push notification chunk', { message: error.message });
      }
    }

    // Check receipts in the background — do not await so we don't block the caller
    if (receiptIds.length > 0) {
      setTimeout(() => cleanupInvalidTokens(receiptIds), 15 * 60 * 1000); // Wait 15 min for receipts to be ready
    }
  } catch (err) {
    logger.error('Push notification setup error', { message: err.message });
  }
};

/**
 * Send an array of personalized push messages
 */
const sendPushMessages = async (messages) => {
  try {
    const validMessages = messages.filter((m) => m.to && typeof m.to === 'string' && Expo.isExpoPushToken(m.to));
    if (validMessages.length === 0) return;

    const chunks = expo.chunkPushNotifications(validMessages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        logger.error('Error sending custom push chunk', { message: err.message });
      }
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
