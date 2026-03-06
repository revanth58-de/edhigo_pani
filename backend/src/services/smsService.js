/**
 * smsService.js
 * Sends real SMS via Fast2SMS (free Indian SMS API).
 * Sign up at https://fast2sms.com to get a free API key.
 */

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send an OTP SMS to an Indian phone number.
 * @param {string} phone - 10-digit Indian mobile number (no country code)
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPSms = async (phone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  FAST2SMS_API_KEY not set — OTP not sent via SMS');
    return false;
  }

  try {
    const response = await fetch(FAST2SMS_URL, {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q',
        message: `Your Edhigo Pani OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
        language: 'english',
        flash: 0,
        numbers: phone,
      }),
    });

    const result = await response.json();

    if (result.return === true) {
      console.log(`📱 OTP SMS sent to ${phone}: ${otp}`);
      return true;
    } else {
      console.error('❌ Fast2SMS error:', result.message);
      return false;
    }
  } catch (err) {
    console.error('💥 SMS send error:', err.message);
    return false;
  }
};

module.exports = { sendOTPSms };
