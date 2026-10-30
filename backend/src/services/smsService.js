/**
 * smsService.js
 * Sends real OTP SMS via SMS_API (custom URL or API key), Renflair SMS Gateway, or Fast2SMS.
 * Supports fallback and multiple retries without throwing uncaught errors.
 */

const RENFLAIR_BASE_URL = 'https://sms.renflair.in/V1.php';
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';
const { logger } = require('../middleware/errorHandler');

// Android SMS Retriever API hash — enables auto-read of OTP on the mobile app.
const SMS_APK_HASH = '4403b4b16e3df066b4d44bb00fd2daeb';

/**
 * Resolve SMS configuration from environment variables.
 * Prioritizes SMS_API (from Render), then RENFLAIR_API_KEY, then FAST2SMS_API_KEY.
 */
const getSmsConfig = () => {
  const smsApi = (process.env.SMS_API || process.env.SMS_API_KEY || '').trim();
  const renflairKey = (process.env.RENFLAIR_API_KEY || '').trim();
  const fast2smsKey = (process.env.FAST2SMS_API_KEY || '').trim();

  const isUrl = (val) => typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

  return {
    smsApi,
    isCustomUrl: isUrl(smsApi),
    renflairKey: renflairKey || (!isUrl(smsApi) ? smsApi : ''),
    fast2smsKey: fast2smsKey || (!isUrl(smsApi) && !renflairKey ? smsApi : ''),
  };
};

/**
 * Dispatch OTP via a custom SMS API URL (if SMS_API is set as a full URL in Render).
 * Automatically replaces placeholders like {phone}, {otp}, {{phone}}, {{otp}},
 * or appends ?phone=...&otp=... (or ?PHONE=...&OTP=... for Renflair-style endpoints).
 *
 * @param {string} url - The URL endpoint from SMS_API
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp   - The 4-digit OTP
 * @returns {Promise<boolean>}
 */
const sendCustomUrlSMS = async (url, phone, otp) => {
  try {
    let targetUrl = url.trim();

    if (/\{\{phone\}\}|\{phone\}|\$PHONE/i.test(targetUrl) || /\{\{otp\}\}|\{otp\}|\$OTP/i.test(targetUrl)) {
      targetUrl = targetUrl
        .replace(/\{\{phone\}\}|\{phone\}|\$PHONE/gi, encodeURIComponent(phone))
        .replace(/\{\{otp\}\}|\{otp\}|\$OTP/gi, encodeURIComponent(otp));
    } else {
      const separator = targetUrl.includes('?') ? '&' : '?';
      if (/renflair/i.test(targetUrl) || /[?&]API=/i.test(targetUrl)) {
        if (!/[?&]PHONE=/i.test(targetUrl)) targetUrl += `${separator}PHONE=${encodeURIComponent(phone)}`;
        if (!/[?&]OTP=/i.test(targetUrl)) targetUrl += `&OTP=${encodeURIComponent(otp)}`;
      } else {
        targetUrl += `${separator}phone=${encodeURIComponent(phone)}&otp=${encodeURIComponent(otp)}`;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = typeof response.text === 'function' ? await response.text().catch(() => '') : '';
      logger.warn(`SMS_API URL returned HTTP ${response.status}`, { details: errText.slice(0, 100) });
      return false;
    }

    const text = typeof response.text === 'function' ? await response.text().catch(() => '') : '';
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }

    if (data && (data.status?.toLowerCase() === 'error' || data.success === false || data.status?.toLowerCase() === 'failed')) {
      logger.warn('SMS_API endpoint returned failure message', { message: data.message });
      return false;
    }

    if (!data && typeof text === 'string') {
      const lower = text.toLowerCase();
      if (lower.includes('error') || lower.includes('invalid') || lower.includes('failed')) {
        logger.warn('SMS_API endpoint returned error string', { details: text.slice(0, 100) });
        return false;
      }
    }

    logger.info('OTP SMS sent successfully via custom SMS_API URL', { phone });
    return true;
  } catch (err) {
    logger.warn('SMS_API custom URL request failed', { phone, message: err.message });
    return false;
  }
};

/**
 * Send an OTP SMS via Renflair SMS Gateway.
 * @param {string} phone - 10-digit Indian mobile number
 * @param {string} otp   - The 4-digit OTP
 * @param {string} [overrideKey] - Optional API key override
 * @returns {Promise<boolean>}
 */
const sendRenflairSMS = async (phone, otp, overrideKey) => {
  const apiKey = overrideKey || process.env.RENFLAIR_API_KEY || process.env.SMS_API || process.env.SMS_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.startsWith('http')) return false;

  const url = `${RENFLAIR_BASE_URL}?API=${encodeURIComponent(apiKey.trim())}&PHONE=${encodeURIComponent(phone)}&OTP=${encodeURIComponent(otp)}`;
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

    const text = typeof response.text === 'function' ? await response.text() : '';
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }

    if (data && (data.status?.toLowerCase() === 'error' || data.success === false || data.status?.toLowerCase() === 'failed')) {
      throw new Error(data.message || 'Renflair returned failure');
    }

    if (!data && typeof text === 'string') {
      const lower = text.toLowerCase();
      if (lower.includes('error') || lower.includes('invalid') || lower.includes('failed')) {
        throw new Error(text.slice(0, 100));
      }
    }

    logger.info('OTP SMS sent successfully via Renflair', { phone, message: data?.message || text?.slice(0, 50) });
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
 * @param {string} [overrideKey] - Optional API key override
 * @returns {Promise<boolean>}
 */
const sendFast2SMSSMS = async (phone, otp, overrideKey) => {
  const apiKey = overrideKey || process.env.FAST2SMS_API_KEY || (!process.env.RENFLAIR_API_KEY ? (process.env.SMS_API || process.env.SMS_API_KEY) : null);
  if (!apiKey || typeof apiKey !== 'string' || apiKey.startsWith('http')) return false;

  const controller = new AbortController();
  const smsTimeout = setTimeout(() => controller.abort(), 8000);

  try {
    // Try Fast2SMS dedicated OTP route first
    const response = await fetch(FAST2SMS_URL, {
      method: 'POST',
      headers: {
        authorization: apiKey.trim(),
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
      const result = typeof response.json === 'function' ? await response.json().catch(() => null) : null;
      if (result && (result.return === true || result.status_code === 200)) {
        logger.info('OTP SMS sent successfully via Fast2SMS', { phone });
        return true;
      }
      if (result && result.message) {
        logger.warn('Fast2SMS OTP route returned message', { message: result.message });
      }
    } else {
      const errText = typeof response.text === 'function' ? await response.text().catch(() => '') : '';
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
 * Supports SMS_API (custom URL or key), Renflair, and Fast2SMS with automatic fallback.
 *
 * @param {string} phone - 10-digit Indian mobile number (no country code)
 * @param {string} otp   - The OTP to send
 * @returns {Promise<boolean>} - true if sent successfully
 */
const sendOTPSms = async (phone, otp) => {
  const { smsApi, isCustomUrl, renflairKey, fast2smsKey } = getSmsConfig();

  if (!smsApi && !renflairKey && !fast2smsKey) {
    logger.warn('No SMS API configured (SMS_API, RENFLAIR_API_KEY, or FAST2SMS_API_KEY) — OTP not sent via SMS');
    return false;
  }

  // 1. If SMS_API is provided as a full URL, attempt direct dispatch
  if (isCustomUrl) {
    const urlSuccess = await sendCustomUrlSMS(smsApi, phone, otp);
    if (urlSuccess) return true;
    logger.info('Custom SMS_API URL attempt failed, trying fallback gateways...');
  }

  // 2. Try Renflair SMS Gateway (or SMS_API when provided as an API key)
  if (renflairKey) {
    const renflairSuccess = await sendRenflairSMS(phone, otp, renflairKey);
    if (renflairSuccess) return true;
    if (!fast2smsKey) return false;
    logger.info('Primary SMS dispatch failed, attempting Fast2SMS fallback...');
  }

  // 3. Try Fast2SMS Gateway
  if (fast2smsKey) {
    const maxAttempts = 4;
    const delays = [1000, 2000, 4000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const success = await sendFast2SMSSMS(phone, otp, fast2smsKey);
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

module.exports = {
  sendOTPSms,
  sendRenflairSMS,
  sendFast2SMSSMS,
  sendCustomUrlSMS,
  SMS_APK_HASH,
};
