const { sendOTPSms, sendRenflairSMS, sendFast2SMSSMS, sendCustomUrlSMS } = require('../src/services/smsService');

describe('smsService - sendOTPSms', () => {
  let originalFetch;
  let originalRenflairKey;
  let originalFast2smsKey;
  let originalSmsApi;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalRenflairKey = process.env.RENFLAIR_API_KEY;
    originalFast2smsKey = process.env.FAST2SMS_API_KEY;
    originalSmsApi = process.env.SMS_API;

    delete process.env.RENFLAIR_API_KEY;
    delete process.env.SMS_API;
    process.env.FAST2SMS_API_KEY = 'mock-api-key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.FAST2SMS_API_KEY;
    delete process.env.SMS_API;

    if (originalRenflairKey) process.env.RENFLAIR_API_KEY = originalRenflairKey;
    if (originalFast2smsKey) process.env.FAST2SMS_API_KEY = originalFast2smsKey;
    if (originalSmsApi) process.env.SMS_API = originalSmsApi;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    delete process.env.RENFLAIR_API_KEY;
    delete process.env.SMS_API;
    delete process.env.SMS_API_KEY;
    process.env.FAST2SMS_API_KEY = 'mock-api-key';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false if API key is not set', async () => {
    delete process.env.FAST2SMS_API_KEY;
    delete process.env.SMS_API;
    delete process.env.RENFLAIR_API_KEY;

    const result = await sendOTPSms('9876543210', '123456');
    expect(result).toBe(false);
  });

  it('should return true on first attempt if API returns success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ return: true }),
    });

    const resultPromise = sendOTPSms('9876543210', '123456');
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually return true if it succeeds', async () => {
    // 1st attempt: HTTP error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    // 2nd attempt: Success
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ return: true }),
    });

    const resultPromise = sendOTPSms('9876543210', '123456');

    // Advance timer to trigger the backoff delay (1000ms)
    await jest.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should retry up to 4 attempts and return false if all fail', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
    }

    const resultPromise = sendOTPSms('9876543210', '123456');

    // Advance timers through all backoffs: 1000ms, 2000ms, 4000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(4000);

    const result = await resultPromise;
    expect(result).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  describe('Render SMS_API Variable (API Key & Custom URL)', () => {
    it('should dispatch successfully using SMS_API as an API key', async () => {
      delete process.env.FAST2SMS_API_KEY;
      delete process.env.RENFLAIR_API_KEY;
      process.env.SMS_API = 'render-sms-api-key-123';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'SUCCESS', message: 'SMS SENT' }),
      });

      const result = await sendOTPSms('9876543210', '4321');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('API=render-sms-api-key-123');
      expect(calledUrl).toContain('PHONE=9876543210');
      expect(calledUrl).toContain('OTP=4321');
    });

    it('should dispatch successfully using SMS_API as a custom URL endpoint with placeholders', async () => {
      delete process.env.FAST2SMS_API_KEY;
      process.env.SMS_API = 'https://custom-gateway.io/send?to={phone}&code={otp}&token=xyz';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true }),
      });

      const result = await sendOTPSms('9876543210', '5678');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://custom-gateway.io/send?to=9876543210&code=5678&token=xyz');
    });

    it('should dispatch successfully using SMS_API URL without placeholders by appending params', async () => {
      delete process.env.FAST2SMS_API_KEY;
      process.env.SMS_API = 'https://sms.renflair.in/V1.php?API=render-key';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'SUCCESS' }),
      });

      const result = await sendOTPSms('9876543210', '9999');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://sms.renflair.in/V1.php?API=render-key');
      expect(calledUrl).toContain('PHONE=9876543210');
      expect(calledUrl).toContain('OTP=9999');
    });

    it('should fallback to Fast2SMS if SMS_API custom URL fails', async () => {
      process.env.SMS_API = 'https://custom-gateway.io/send?to={phone}&code={otp}';
      process.env.FAST2SMS_API_KEY = 'mock-fast2sms-key';

      // 1. Custom URL fails with 500
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // 2. Fast2SMS succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ return: true }),
      });

      const result = await sendOTPSms('9876543210', '1234');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Renflair SMS Gateway', () => {
    beforeEach(() => {
      process.env.RENFLAIR_API_KEY = 'test-renflair-key';
      delete process.env.FAST2SMS_API_KEY;
      delete process.env.SMS_API;
    });

    afterEach(() => {
      delete process.env.RENFLAIR_API_KEY;
    });

    it('should successfully send OTP via Renflair API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'success', message: 'SMS sent successfully' }),
      });

      const result = await sendOTPSms('9876543210', '1234');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('https://sms.renflair.in/V1.php');
      expect(calledUrl).toContain('API=test-renflair-key');
      expect(calledUrl).toContain('PHONE=9876543210');
      expect(calledUrl).toContain('OTP=1234');
    });

    it('should fallback to Fast2SMS if Renflair fails and Fast2SMS key is present', async () => {
      process.env.FAST2SMS_API_KEY = 'mock-fast2sms-key';

      // Renflair fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Fast2SMS succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ return: true }),
      });

      const result = await sendOTPSms('9876543210', '1234');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
