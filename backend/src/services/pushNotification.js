const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification using the official Expo SDK
 */
const sendPush = async (tokens, title, body, data = {}) => {
  try {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const validTokens = tokenList.filter((t) => typeof t === 'string' && Expo.isExpoPushToken(t));

    if (validTokens.length === 0) {
      console.log('📵 No valid push tokens — skipping notification');
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
    const tickets = [];

    for (let chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log(`📲 Push chunk sent. Tickets:`, ticketChunk.length);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('💥 Error sending push notification chunk:', error);
      }
    }
  } catch (err) {
    console.error('💥 Push notification setup error:', err.message);
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
        console.error('💥 Error sending custom push chunk:', err.message);
      }
    }
  } catch (err) {
    console.error('💥 Push notification batch setup error:', err.message);
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
