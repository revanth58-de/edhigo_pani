const { sendOTPSms } = require('../src/services/smsService');

describe('smsService - sendOTPSms', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    process.env.FAST2SMS_API_KEY = 'mock-api-key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.FAST2SMS_API_KEY;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false if API key is not set', async () => {
    const originalKey = process.env.FAST2SMS_API_KEY;
    delete process.env.FAST2SMS_API_KEY;

    const result = await sendOTPSms('9876543210', '123456');
    expect(result).toBe(false);

    process.env.FAST2SMS_API_KEY = originalKey;
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

  describe('Renflair SMS Gateway', () => {
    beforeEach(() => {
      process.env.RENFLAIR_API_KEY = 'test-renflair-key';
      delete process.env.FAST2SMS_API_KEY;
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
