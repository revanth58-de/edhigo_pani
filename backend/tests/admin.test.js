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

describe('Admin Middleware Initialization Checks (S6)', () => {
  let originalEnv;

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
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'same-secret-123';
    process.env.ADMIN_JWT_SECRET = 'same-secret-123';

    expect(() => {
      require('../src/middleware/admin.middleware');
    }).toThrow(/ADMIN_JWT_SECRET must not be identical to JWT_SECRET/);
  });

  test('✅ Do not throw in production if ADMIN_JWT_SECRET is different from JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secret-a';
    process.env.ADMIN_JWT_SECRET = 'secret-b';

    expect(() => {
      require('../src/middleware/admin.middleware');
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
