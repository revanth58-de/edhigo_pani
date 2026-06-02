const { sendOTPWhatsapp } = require('../src/services/whatsappService');

describe('whatsappService - sendOTPWhatsapp', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    global.fetch = jest.fn();
    delete process.env.WHATSAPP_PROVIDER;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_WHATSAPP_FROM;
    delete process.env.ULTRAMSG_INSTANCE_ID;
    delete process.env.ULTRAMSG_TOKEN;
  });

  it('should return false if ultramsg is selected but credentials are not set', async () => {
    process.env.WHATSAPP_PROVIDER = 'ultramsg';
    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(false);
  });

  it('should return false if twilio is selected but credentials are not set', async () => {
    process.env.WHATSAPP_PROVIDER = 'twilio';
    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(false);
  });

  it('should return true if ultramsg is selected and returns success', async () => {
    process.env.WHATSAPP_PROVIDER = 'ultramsg';
    process.env.ULTRAMSG_INSTANCE_ID = 'instance123';
    process.env.ULTRAMSG_TOKEN = 'token123';

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sent: 'true' }),
    });

    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.ultramsg.com/instance123/messages/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"to":"+919876543210"'),
      })
    );
  });

  it('should return true if twilio is selected and returns success', async () => {
    process.env.WHATSAPP_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'sid123';
    process.env.TWILIO_AUTH_TOKEN = 'auth123';

    global.fetch.mockResolvedValueOnce({
      ok: true,
    });

    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/sid123/Messages.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    );
  });

  it('should return false if ultramsg returns HTTP failure', async () => {
    process.env.WHATSAPP_PROVIDER = 'ultramsg';
    process.env.ULTRAMSG_INSTANCE_ID = 'instance123';
    process.env.ULTRAMSG_TOKEN = 'token123';

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(false);
  });

  it('should return false if twilio returns HTTP failure', async () => {
    process.env.WHATSAPP_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'sid123';
    process.env.TWILIO_AUTH_TOKEN = 'auth123';

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid parameter',
    });

    const result = await sendOTPWhatsapp('9876543210', '1234');
    expect(result).toBe(false);
  });
});
