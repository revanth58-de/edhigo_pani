/**
 * smsService.js
 * Sends real SMS via Fast2SMS (free Indian SMS API).
 * Sign up at https://fast2sms.com to get a free API key.
 */

const RENFLAIR_BASE_URL = 'https://sms.renflair.in/V1.php';
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const { logger } = require('../middleware/errorHandler');

// Android SMS Retriever API hash — enables auto-read of OTP on the mobile app.
// This hash is derived from the app's signing certificate + package name.
const SMS_APK_HASH = '4403b4b16e3df066b4d44bb00fd2daeb';

/**
 * Send an OTP SMS via Renflair SMS Gateway (sample-login-page-with-otp API).
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
 * Send an OTP SMS to an Indian phone number.
 * Supports both Renflair SMS (from sample zip) and Fast2SMS.
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

  const apiKey = fast2smsKey;

  const maxAttempts = 4;
  const delays = [1000, 2000, 4000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const smsTimeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(FAST2SMS_URL, {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: `<#> Your DINASARI OTP is: ${otp}. Valid for 5 minutes. Do not share.\n${SMS_APK_HASH}`,
          language: 'english',
          flash: 0,
          numbers: phone,
        }),
        signal: controller.signal,
      });
      clearTimeout(smsTimeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.return === true) {
        logger.info('OTP SMS sent successfully', { phone });
        return true;
      } else {
        throw new Error(result.message || 'Fast2SMS returned failure status');
      }
    } catch (err) {
      clearTimeout(smsTimeout);
      const isTimeout = err.name === 'AbortError';
      const errMsg = isTimeout ? 'Fast2SMS timed out after 8s' : err.message;

      logger.warn(`SMS send attempt ${attempt} failed`, {
        phone,
        message: errMsg,
      });

      if (attempt < maxAttempts) {
        const backoffMs = delays[attempt - 1];
        logger.info(`Retrying SMS dispatch in ${backoffMs}ms...`, { attempt, phone });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        logger.error('All SMS dispatch attempts failed', { phone });
      }
    }
  }

  return false;
};

module.exports = { sendOTPSms, sendRenflairSMS };
