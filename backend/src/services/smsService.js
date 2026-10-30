/**
 * smsService.js
 * Sends real OTP SMS via Renflair SMS Gateway or Fast2SMS Gateway.
 * Supports fallback and multiple retries.
 */

const RENFLAIR_BASE_URL = 'https://sms.renflair.in/V1.php';
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const { logger } = require('../middleware/errorHandler');

// Android SMS Retriever API hash — enables auto-read of OTP on the mobile app.
const SMS_APK_HASH = '4403b4b16e3df066b4d44bb00fd2daeb';

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
 * Send an OTP SMS via Fast2SMS Gateway.
 * Tries OTP route first, then Quick SMS route.
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp   - The 4-digit OTP
 * @returns {Promise<boolean>}
 */
const sendFast2SMSSMS = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return false;

  const controller = new AbortController();
  const smsTimeout = setTimeout(() => controller.abort(), 8000);

  try {
    // Try Fast2SMS dedicated OTP route first
    const response = await fetch(FAST2SMS_URL, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone,
      }),
      signal: controller.signal,
    });
    clearTimeout(smsTimeout);

    if (response.ok) {
      const result = await response.json().catch(() => null);
      if (result && (result.return === true || result.status_code === 200)) {
        logger.info('OTP SMS sent successfully via Fast2SMS', { phone });
        return true;
      }
      if (result && result.message) {
        logger.warn('Fast2SMS OTP route returned message', { message: result.message });
      }
    } else {
      const errText = await response.text().catch(() => '');
      logger.warn(`Fast2SMS HTTP status ${response.status}`, { details: errText.slice(0, 200) });
    }
  } catch (err) {
    clearTimeout(smsTimeout);
    logger.warn('Fast2SMS send error', { message: err.message });
  }

  return false;
};

/**
 * Send an OTP SMS to an Indian phone number.
 * Supports both Renflair SMS and Fast2SMS with automatic fallback.
 * @param {string} phone - 10-digit Indian mobile number (no country code)
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPSms = async (phone, otp) => {
  const renflairKey = process.env.RENFLAIR_API_KEY;
  const fast2smsKey = process.env.FAST2SMS_API_KEY;

  if (!renflairKey && !fast2smsKey) {
    logger.warn('Neither RENFLAIR_API_KEY nor FAST2SMS_API_KEY set — OTP not sent via SMS');
    return false;
  }

  // 1. Try Renflair SMS Gateway first if configured
  if (renflairKey) {
    const renflairSuccess = await sendRenflairSMS(phone, otp);
    if (renflairSuccess) return true;
    if (!fast2smsKey) return false;
    logger.info('Renflair dispatch failed, attempting Fast2SMS fallback...');
  }

  // 2. Try Fast2SMS Gateway
  if (fast2smsKey) {
    const maxAttempts = 4;
    const delays = [1000, 2000, 4000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const success = await sendFast2SMSSMS(phone, otp);
      if (success) return true;

      if (attempt < maxAttempts) {
        const backoffMs = delays[attempt - 1];
        logger.info(`Retrying SMS dispatch in ${backoffMs}ms...`, { attempt, phone });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        logger.error('All Fast2SMS dispatch attempts failed', { phone });
      }
    }
  }

  return false;
};

module.exports = { sendOTPSms, sendRenflairSMS, sendFast2SMSSMS };
