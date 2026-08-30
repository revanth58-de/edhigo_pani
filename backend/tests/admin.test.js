/**
 * Admin API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'edhigo-admin-secret-2024';
const adminH = { 'x-admin-secret': ADMIN_SECRET };

let testFarmer;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer;
});

afterAll(async () => {
  await cleanupTestUsers();
});

describe('GET /api/admin/stats', () => {
  test('✅ Valid secret → 200 + users/jobs/payments', async () => {
    const res = await request(app).get('/api/admin/stats').set(adminH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('jobs');
    expect(res.body).toHaveProperty('payments');
    expect(res.body.users).toHaveProperty('total');
    expect(res.body.users).toHaveProperty('byRole');
  });

  test('❌ Missing secret → 401/403', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect([401, 403]).toContain(res.statusCode);
  });

  test('❌ Wrong secret → 401/403', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set({ 'x-admin-secret': 'wrong-secret-xyz' });
    expect([401, 403]).toContain(res.statusCode);
  });
});

describe('GET /api/admin/users', () => {
  test('✅ Returns paginated user list → 200', async () => {
    const res = await request(app).get('/api/admin/users').set(adminH);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body).toHaveProperty('total');
  });

  test('✅ Filter by role=farmer → only farmers', async () => {
    const res = await request(app).get('/api/admin/users?role=farmer').set(adminH);
    expect(res.statusCode).toBe(200);
    res.body.users.forEach((u) => expect(u.role).toBe('farmer'));
  });
});

describe('PATCH /api/admin/users/:id', () => {
  test('✅ Update user status → 200', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${testFarmer.id}`)
      .set(adminH)
      .send({ status: 'active' });
    expect(res.statusCode).toBe(200);
  });

  test('❌ Non-existent user → 404', async () => {
    const res = await request(app)
      .patch('/api/admin/users/non-existent-user-id')
      .set(adminH)
      .send({ status: 'active' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/admin/jobs', () => {
  test('✅ Returns all jobs → 200', async () => {
    const res = await request(app).get('/api/admin/jobs').set(adminH);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });
});

describe('GET /api/admin/payments', () => {
  test('✅ Returns payment logs → 200', async () => {
    const res = await request(app).get('/api/admin/payments').set(adminH);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.payments)).toBe(true);
  });
});

describe('GET /api/admin/ratings', () => {
  test('✅ Returns all ratings → 200', async () => {
    const res = await request(app).get('/api/admin/ratings').set(adminH);
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/admin/attendance', () => {
  test('✅ Returns attendance records → 200', async () => {
    const res = await request(app).get('/api/admin/attendance').set(adminH);
    expect(res.statusCode).toBe(200);
  });
});

describe('Admin Middleware & Production Self-Check (S6)', () => {
  let originalEnv;

  const setMockProductionEnv = () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dinasari';
    process.env.JWT_SECRET = 'valid-production-jwt-secret-string-64-bytes-abc1234567890';
    process.env.JWT_REFRESH_SECRET = 'valid-production-jwt-refresh-secret-string-64-bytes-def0987654321';
    process.env.ADMIN_SECRET = 'strong-admin-password-123';
    process.env.ADMIN_JWT_SECRET = 'valid-admin-jwt-secret-string-64-bytes-ghi1234567890';
    process.env.FAST2SMS_API_KEY = 'real-fast2sms-api-key-string';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_realKey123456';
    process.env.RAZORPAY_KEY_SECRET = 'realRazorpaySecretString';
    process.env.CLOUDINARY_CLOUD_NAME = 'realCloudName';
    process.env.CLOUDINARY_API_KEY = '123456789012345';
    process.env.CLOUDINARY_API_SECRET = 'realCloudinaryApiSecret';
    process.env.SENTRY_DSN = 'https://abc@sentry.io/123456';
    process.env.GEOFENCE_ENABLED = 'true';
    process.env.ALLOWED_ORIGIN = 'https://www.dinasari.co.in';
  };

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
    jest.resetModules();
  });

  test('❌ Throw error in production if ADMIN_JWT_SECRET is identical to JWT_SECRET', () => {
    setMockProductionEnv();
    process.env.JWT_SECRET = 'same-secret-64-characters-long-unique-sample-string-abc-1234567890';
    process.env.ADMIN_JWT_SECRET = 'same-secret-64-characters-long-unique-sample-string-abc-1234567890';

    expect(() => {
      require('../src/config/env');
    }).toThrow(/ADMIN_JWT_SECRET cannot be identical to JWT_SECRET/);
  });

  test('❌ Throw error in production if any required secret contains placeholder markers', () => {
    setMockProductionEnv();
    process.env.FAST2SMS_API_KEY = 'YOUR_FAST2SMS_API_KEY_HERE';

    expect(() => {
      require('../src/config/env');
    }).toThrow(/Production environment self-check failed/);
  });

  test('✅ Do not throw in production if all secrets are valid and distinct', () => {
    setMockProductionEnv();

    expect(() => {
      require('../src/config/env');
    }).not.toThrow();
  });

  test('✅ Do not throw in development even if secrets are identical', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'same-secret-123';
    process.env.ADMIN_JWT_SECRET = 'same-secret-123';

    expect(() => {
      require('../src/middleware/admin.middleware');
    }).not.toThrow();
  });
});

describe('System Settings Endpoints', () => {
  test('✅ GET /api/admin/settings → 200 + retrieve initialized default settings', async () => {
    const res = await request(app).get('/api/admin/settings').set(adminH);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('settings');
    expect(res.body.settings['wages.minDailyWage']).toBeDefined();
    expect(res.body.settings['app.platformCommission']).toBe('5');
  });

  test('✅ PATCH /api/admin/settings → 200 + update settings successfully', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .set(adminH)
      .send({
        'wages.minDailyWage': '480',
        'app.platformCommission': '8'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('settings');
    expect(res.body.settings['wages.minDailyWage']).toBe('480');
    expect(res.body.settings['app.platformCommission']).toBe('8');

    // Restore defaults for other tests
    await request(app)
      .patch('/api/admin/settings')
      .set(adminH)
      .send({
        'wages.minDailyWage': '400',
        'app.platformCommission': '5'
      });
  });

  test('❌ PATCH /api/admin/settings unauthorized → 401/403', async () => {
    const res = await request(app)
      .patch('/api/admin/settings')
      .send({ 'wages.minDailyWage': '999' });
    expect([401, 403]).toContain(res.statusCode);
  });
});
