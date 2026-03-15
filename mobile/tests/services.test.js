/**
 * Service Unit Tests
 * Tests that every API service wrapper calls the correct endpoint
 * and passes the correct payload — WITHOUT hitting a real server.
 *
 * axios instance is mocked globally in tests/setup.js.
 */

// ── Pull the raw axios mock before mocking services ───────────────────────────
const mockGet = jest.fn(() => Promise.resolve({ data: {} }));
const mockPost = jest.fn(() => Promise.resolve({ data: {} }));
const mockPut = jest.fn(() => Promise.resolve({ data: {} }));
const mockPatch = jest.fn(() => Promise.resolve({ data: {} }));
const mockDelete = jest.fn(() => Promise.resolve({ data: {} }));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  })),
  defaults: { headers: { common: {} } },
}));

// ─── Auth Service ────────────────────────────────────────────────────────────
describe('authService', () => {
  let authService;

  beforeAll(() => {
    authService = require('../../src/services/api/authService').authService;
  });

  beforeEach(() => {
    mockPost.mockClear();
    mockGet.mockClear();
    mockPut.mockClear();
  });

  test('sendOTP → calls POST with phone', async () => {
    await authService.sendOTP('9876543210');
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('send-otp'),
      expect.objectContaining({ phone: '9876543210' })
    );
  });

  test('verifyOTP → calls POST with phone and otp', async () => {
    await authService.verifyOTP({ phone: '9876543210', otp: '1234' });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('verify-otp'),
      expect.objectContaining({ phone: '9876543210', otp: '1234' })
    );
  });

  test('getMe → calls GET on /auth/me', async () => {
    await authService.getMe();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('me'));
  });

  test('updateProfile → calls PUT/PATCH with payload', async () => {
    await authService.updateProfile({ name: 'New Name', village: 'Village X' });
    const called = mockPut.mock.calls.length > 0 || mockPatch.mock.calls.length > 0;
    expect(called).toBe(true);
  });
});

// ─── Job Service ─────────────────────────────────────────────────────────────
describe('jobService', () => {
  let jobService;

  beforeAll(() => {
    jobService = require('../../src/services/api/jobService').jobService;
  });

  beforeEach(() => {
    mockPost.mockClear();
    mockGet.mockClear();
    mockDelete.mockClear();
  });

  test('createJob → POST /jobs with payload', async () => {
    await jobService.createJob({ workType: 'Harvesting', payPerDay: 500 });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('jobs'),
      expect.objectContaining({ workType: 'Harvesting' })
    );
  });

  test('getJobs → GET /jobs', async () => {
    await jobService.getJobs();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('jobs'), expect.anything());
  });

  test('acceptJob → POST /jobs/:id/accept', async () => {
    await jobService.acceptJob('job-1');
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('job-1/accept'),
      expect.anything()
    );
  });

  test('getNearbyWorkers → GET with lat/lng params', async () => {
    await jobService.getNearbyWorkers({ lat: 16.5, lng: 80.6 });
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('nearby-workers'),
      expect.objectContaining({ params: expect.objectContaining({ lat: 16.5, lng: 80.6 }) })
    );
  });

  test('cancelJob → DELETE /jobs/:id', async () => {
    await jobService.cancelJob('job-1');
    expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining('job-1'));
  });
});

// ─── Group Service ────────────────────────────────────────────────────────────
describe('groupService', () => {
  let groupService;

  beforeAll(() => {
    groupService = require('../../src/services/api/groupService').groupService;
  });

  beforeEach(() => {
    mockPost.mockClear();
    mockGet.mockClear();
  });

  test('createGroup → POST /groups with name + skills', async () => {
    await groupService.createGroup({ name: 'Reapers', skills: ['Harvesting'] });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('groups'),
      expect.objectContaining({ name: 'Reapers' })
    );
  });

  test('getMyGroups → GET /groups/my-groups', async () => {
    await groupService.getMyGroups();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('my-groups'), expect.anything());
  });
});

// ─── Attendance Service ───────────────────────────────────────────────────────
describe('attendanceService', () => {
  let attendanceService;

  beforeAll(() => {
    attendanceService = require('../../src/services/api/attendanceService').attendanceService ||
      require('../../src/services/api/attendanceService').default;
  });

  beforeEach(() => { mockPost.mockClear(); });

  test('checkIn → POST /attendance/check-in with qrData + coords', async () => {
    await attendanceService.checkIn({ qrData: 'QR|123', latitude: 16.5, longitude: 80.6 });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('check-in'),
      expect.objectContaining({ qrData: 'QR|123' })
    );
  });
});

// ─── Payment Service ──────────────────────────────────────────────────────────
describe('paymentService', () => {
  let paymentService;

  beforeAll(() => {
    paymentService = require('../../src/services/api/paymentService').paymentService ||
      require('../../src/services/api/paymentService').default;
  });

  beforeEach(() => {
    mockPost.mockClear();
    mockGet.mockClear();
  });

  test('makePayment → POST /payments with jobId, workerId, amount', async () => {
    await paymentService.makePayment({ jobId: 'j-1', workerId: 'w-1', amount: 500 });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('payments'),
      expect.objectContaining({ jobId: 'j-1', workerId: 'w-1', amount: 500 })
    );
  });

  test('getPaymentHistory → GET /payments/history/:userId', async () => {
    await paymentService.getPaymentHistory('user-1');
    expect(mockGet).toHaveBeenCalledWith(
      expect.stringContaining('history/user-1'),
      expect.anything()
    );
  });
});

// ─── Rating Service ───────────────────────────────────────────────────────────
describe('ratingService', () => {
  let ratingService;

  beforeAll(() => {
    ratingService = require('../../src/services/api/ratingService').ratingService ||
      require('../../src/services/api/ratingService').default;
  });

  beforeEach(() => { mockPost.mockClear(); });

  test('rateWorker → POST /ratings/worker', async () => {
    await ratingService.rateWorker({ jobId: 'j-1', rateeId: 'w-1', rating: 4 });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('worker'),
      expect.objectContaining({ rating: 4 })
    );
  });

  test('rateFarmer → POST /ratings/farmer', async () => {
    await ratingService.rateFarmer({ jobId: 'j-1', farmerId: 'f-1', rating: 5 });
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('farmer'),
      expect.objectContaining({ rating: 5 })
    );
  });
});

// ─── i18n Tests ───────────────────────────────────────────────────────────────
describe('i18n useTranslation', () => {
  test('Returns a string for common.worker in English', () => {
    const en = require('../../src/i18n/en').default || require('../../src/i18n/en');
    expect(typeof en.common?.worker).toBe('string');
  });

  test('Hindi has the same key count as English', () => {
    const en = require('../../src/i18n/en').default || require('../../src/i18n/en');
    const hi = require('../../src/i18n/hi').default || require('../../src/i18n/hi');
    const enKeys = Object.keys(en).sort();
    const hiKeys = Object.keys(hi).sort();
    expect(hiKeys).toEqual(enKeys);
  });

  test('Telugu has the same key count as English', () => {
    const en = require('../../src/i18n/en').default || require('../../src/i18n/en');
    const te = require('../../src/i18n/te').default || require('../../src/i18n/te');
    const enKeys = Object.keys(en).sort();
    const teKeys = Object.keys(te).sort();
    expect(teKeys).toEqual(enKeys);
  });
});
