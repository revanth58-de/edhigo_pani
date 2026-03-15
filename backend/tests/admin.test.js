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
