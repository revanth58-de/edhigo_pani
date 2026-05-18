/**
 * smsService.js
 * Sends real SMS via Fast2SMS (free Indian SMS API).
 * Sign up at https://fast2sms.com to get a free API key.
 */

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const { logger } = require('../middleware/errorHandler');

/**
 * Send an OTP SMS to an Indian phone number.
 * @param {string} phone - 10-digit Indian mobile number (no country code)
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPSms = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    logger.warn('FAST2SMS_API_KEY not set — OTP not sent via SMS');
    return false;
  }

  // Abort if Fast2SMS doesn't respond within 8 seconds
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
        message: `Your DINASARI OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
        language: 'english',
        flash: 0,
        numbers: phone,
      }),
      signal: controller.signal,
    });
    clearTimeout(smsTimeout);

    const result = await response.json();

    if (result.return === true) {
      // SEC-10 FIX: Never log OTP values — they are security credentials
      logger.info('OTP SMS sent', { phone });
      return true;
    } else {
      logger.error('Fast2SMS error', { message: result.message });
      return false;
    }
  } catch (err) {
    clearTimeout(smsTimeout);
    if (err.name === 'AbortError') {
      logger.error('Fast2SMS timed out after 8s — SMS not sent (OTP still valid for dev)');
    } else {
      logger.error('SMS send error', { message: err.message });
    }
    return false;
  }
};

module.exports = { sendOTPSms };
