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
          message: `Your DINASARI OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
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

module.exports = { sendOTPSms };
