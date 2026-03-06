/**
 * pushNotification.js
 * Sends push notifications via Expo's Push API (free, no Firebase/APNs setup).
 * Workers/farmers must have their pushToken saved in the DB.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to one or more Expo push tokens.
 * @param {string|string[]} tokens - Expo push token(s)
 * @param {string} title
 * @param {string} body
 * @param {object} data - extra data sent with the notification
 */
const sendPush = async (tokens, title, body, data = {}) => {
  try {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    // Filter out nulls/empty tokens
    const validTokens = tokenList.filter(
      (t) => t && typeof t === 'string' && t.startsWith('ExponentPushToken')
    );

    if (validTokens.length === 0) {
      console.log('📵 No valid push tokens — skipping notification');
      return;
    }

    const messages = validTokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`📲 Push sent to ${validTokens.length} device(s):`, result?.data?.[0]?.status || 'ok');
  } catch (err) {
    console.error('💥 Push notification error:', err.message);
    // Non-fatal — don't throw, just log
  }
};

/**
 * Notify workers about a new job offer
 */
const notifyWorkersNewJob = async (workers, job) => {
  const tokens = workers.map((w) => w.pushToken).filter(Boolean);
  const distText = workers[0]?.distanceKm ? `${workers[0].distanceKm} km away` : 'Near you';
  await sendPush(
    tokens,
    '🌾 New Job Available!',
    `${job.workType} work · ₹${job.payPerDay}/day · ${distText}`,
    { jobId: job.id, screen: 'JobOffer' }
  );
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

module.exports = { sendPush, notifyWorkersNewJob, notifyFarmerJobAccepted, notifyWorkerJobRejected };
