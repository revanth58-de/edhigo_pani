/**
 * whatsappService.js
 * Service to dispatch OTPs via WhatsApp API (Twilio or Ultramsg).
 * If no credentials are set, it returns false to trigger fallback to SMS.
 */

const { logger } = require('../middleware/errorHandler');

/**
 * Send an OTP via WhatsApp.
 * @param {string} phone - 10-digit mobile number
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPWhatsapp = async (phone, otp) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'ultramsg';
  const formattedPhone = `91${phone}`;
  const message = `Your DINASARI verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      logger.warn('Twilio WhatsApp credentials not set — skipping WhatsApp OTP');
      return false;
    }

    try {
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:+${formattedPhone}`,
            From: from,
            Body: message,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Twilio returned HTTP ${response.status}: ${errText}`);
      }

      logger.info('OTP sent via Twilio WhatsApp successfully', { phone });
      return true;
    } catch (err) {
      logger.error('Failed to send OTP via Twilio WhatsApp', { error: err.message });
      return false;
    }
  } else if (provider === 'ultramsg') {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;

    if (!instanceId || !token) {
      logger.warn('Ultramsg credentials not set — skipping WhatsApp OTP');
      return false;
    }

    try {
      const response = await fetch(
        `https://api.ultramsg.com/${instanceId}/messages/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token,
            to: `+${formattedPhone}`,
            body: message,
            priority: 10,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ultramsg returned HTTP ${response.status}: ${errText}`);
      }

      const result = await response.json();
      if (result.sent === 'true' || result.success) {
        logger.info('OTP sent via Ultramsg WhatsApp successfully', { phone });
        return true;
      } else {
        throw new Error(result.error || 'Ultramsg returned error status');
      }
    } catch (err) {
      logger.error('Failed to send OTP via Ultramsg WhatsApp', { error: err.message });
      return false;
    }
  }

  logger.warn(`Unknown WhatsApp provider: ${provider}`);
  return false;
};

module.exports = { sendOTPWhatsapp };
