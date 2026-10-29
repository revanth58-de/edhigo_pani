/**
 * smsService.js
 * Sends real OTP SMS via Renflair SMS Gateway.
 * API endpoint: https://sms.renflair.in
 */

const RENFLAIR_BASE_URL = 'https://sms.renflair.in/V1.php';
const { logger } = require('../middleware/errorHandler');

/**
 * Send an OTP SMS via Renflair SMS Gateway.
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp   - The 4-digit OTP
 * @returns {Promise<boolean>}
 */
const sendRenflairSMS = async (phone, otp) => {
  const apiKey = process.env.RENFLAIR_API_KEY;
  if (!apiKey) return false;

  const url = `${RENFLAIR_BASE_URL}?API=${encodeURIComponent(apiKey)}&PHONE=${encodeURIComponent(phone)}&OTP=${encodeURIComponent(otp)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Renflair HTTP status ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }

    if (data && (data.status === 'error' || data.success === false || data.status === 'failed')) {
      throw new Error(data.message || 'Renflair returned failure');
    }

    logger.info('OTP SMS sent successfully via Renflair', { phone });
    return true;
  } catch (err) {
    clearTimeout(timeout);
    logger.warn('Renflair SMS send failed', { phone, message: err.message });
    return false;
  }
};

/**
 * Send an OTP SMS to an Indian phone number via Renflair.
 * Retries up to 3 times with exponential backoff on failure.
 * @param {string} phone - 10-digit Indian mobile number (no country code)
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPSms = async (phone, otp) => {
  const renflairKey = process.env.RENFLAIR_API_KEY;

  if (!renflairKey) {
    logger.warn('RENFLAIR_API_KEY not set — OTP not sent via SMS');
    return false;
  }

  const maxAttempts = 3;
  const delays = [1000, 2000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const success = await sendRenflairSMS(phone, otp);
    if (success) return true;

    if (attempt < maxAttempts) {
      const backoffMs = delays[attempt - 1];
      logger.info(`Retrying SMS dispatch in ${backoffMs}ms...`, { attempt, phone });
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } else {
      logger.error('All SMS dispatch attempts failed', { phone });
    }
  }

  return false;
};

module.exports = { sendOTPSms, sendRenflairSMS };
