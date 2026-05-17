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
 * Notify workers about a new job offer (personalized with distance)
 */
const notifyWorkersNewJob = async (workers, job) => {
  const messages = [];

  for (const worker of workers) {
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
const notifyFarmerJobAccepted = async (farmerToken, worker, job) => {
  await sendPush(
    farmerToken,
    '✅ Worker Accepted Your Job!',
    `${worker.name || 'A worker'} accepted your ${job.workType} job. Tap to view.`,
    { jobId: job.id, screen: 'RequestAccepted' }
  );
};

/**
 * Notify worker that their application was rejected
 */
const notifyWorkerJobRejected = async (workerToken, job) => {
  await sendPush(
    workerToken,
    '❌ Job Application Rejected',
    `Your application for ${job.workType} was not selected this time.`,
    { jobId: job.id }
  );
};

/**
 * Notify farmer that worker withdrew from accepted job
 */
const notifyFarmerJobWithdrawn = async (farmerToken, job) => {
  await sendPush(
    farmerToken,
    '⚠️ Worker Cancelled',
    `The worker cancelled your ${job.workType} job. It has been re-opened to others.`,
    { jobId: job.id }
  );
};

/**
 * Notify worker that job is cancelled by farmer
 */
const notifyWorkerJobCancelled = async (workerTokens, job) => {
  await sendPush(
    workerTokens,
    '❌ Job Cancelled',
    `The farmer has cancelled the ${job.workType} job.`,
    { jobId: job.id }
  );
};

/**
 * Notify farmer of attendance check-in
 */
const notifyFarmerAttendanceIn = async (farmerToken, worker, job) => {
  await sendPush(
    farmerToken,
    '📍 Worker Arrived',
    `${worker.name || 'A worker'} has scanned in and started working.`,
    { jobId: job.id, screen: 'WorkInProgress' }
  );
};

/**
 * Notify farmer of attendance check-out
 */
const notifyFarmerAttendanceOut = async (farmerToken, worker, job, hours) => {
  await sendPush(
    farmerToken,
    '✅ Worker Finished',
    `${worker.name || 'A worker'} has scanned out after ${hours.toFixed(1)} hours.`,
    { jobId: job.id, screen: 'Payment' }
  );
};

/**
 * Notify farmer of worker arrival at farm boundary
 */
const notifyFarmerWorkerArrived = async (farmerToken, worker, job) => {
  await sendPush(
    farmerToken,
    '🔔 Worker Arriving',
    `${worker?.name || 'A worker'} has arrived at your farm for the ${job.workType} job.`,
    { jobId: job.id, screen: 'ArrivalAlert' }
  );
};

module.exports = {
  sendPush,
  notifyWorkersNewJob,
  notifyFarmerJobAccepted,
  notifyWorkerJobRejected,
  notifyFarmerJobWithdrawn,
  notifyWorkerJobCancelled,
  notifyFarmerAttendanceIn,
  notifyFarmerAttendanceOut,
  notifyFarmerWorkerArrived,
};
