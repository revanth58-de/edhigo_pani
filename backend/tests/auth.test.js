/**
 * Auth API Tests — POST /api/auth/send-otp, verify-otp, set-role, refresh, me, profile
 * Jest + Supertest
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker, testLeader;
let farmerToken, workerToken, leaderToken;

beforeAll(async () => {
  ({ testFarmer: farmer, testWorker: worker, testLeader: leader,
     farmerToken, workerToken, leaderToken } = await createTestUsers().then(r => ({
    testFarmer: r.farmer, testWorker: r.worker, testLeader: r.leader,
    farmerToken: r.farmerToken, workerToken: r.workerToken, leaderToken: r.leaderToken,
  })));
  testFarmer = farmer; testWorker = worker; testLeader = leader;
});

afterAll(async () => {
  await cleanupTestUsers();
});

// ─── send-otp ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/send-otp', () => {
  test('✅ Valid 10-digit phone → 200 + message', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: '9876543210' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('OTP');
    // Cleanup temp user
    await prisma.user.deleteMany({ where: { phone: '9876543210' } });
  });

  test('❌ Missing phone → 400', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('❌ Invalid phone (5 digits) → 400', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: '12345' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid phone/i);
  });

  test('❌ Phone starting with 0 → 400', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: '0123456789' });
    expect(res.statusCode).toBe(400);
  });
});

// ─── verify-otp ───────────────────────────────────────────────────────────────
describe('POST /api/auth/verify-otp', () => {
  test('✅ Correct OTP → 200 + accessToken + refreshToken', async () => {
    const phoneForTest = '9111222333';
    const sendRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ phone: phoneForTest });
    const devOtp = sendRes.body.devOtp;
    expect(devOtp).toBeDefined();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: phoneForTest, otp: devOtp });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('phone', phoneForTest);
    await prisma.user.deleteMany({ where: { phone: phoneForTest } });
  });

  test('❌ Wrong OTP → 401', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: testFarmer.phone, otp: '0000' });
    expect(res.statusCode).toBe(401);
  });

  test('❌ Missing phone → 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ otp: '1234' });
    expect(res.statusCode).toBe(400);
  });

  test('❌ Non-existent user → 404', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phone: '9000000000', otp: '1234' });
    expect(res.statusCode).toBe(404);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('✅ With valid JWT → 200 + user object', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toHaveProperty('id', testFarmer.id);
    expect(res.body.user).toHaveProperty('role', 'farmer');
    expect(res.body.user).not.toHaveProperty('otp');
  });

  test('❌ No token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('❌ Malformed token → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.statusCode).toBe(401);
  });
});

// ─── POST /api/auth/set-role ──────────────────────────────────────────────────
describe('POST /api/auth/set-role', () => {
  test('✅ Set role to farmer → 200', async () => {
    const res = await request(app)
      .post('/api/auth/set-role')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ role: 'farmer' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.role).toBe('farmer');
    // Restore role
    await prisma.user.update({
      where: { id: testWorker.id },
      data: { role: 'worker' },
    });
  });

  test('❌ Invalid role → 400', async () => {
    const res = await request(app)
      .post('/api/auth/set-role')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ role: 'admin' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/valid role/i);
  });

  test('❌ Missing auth → 401', async () => {
    const res = await request(app)
      .post('/api/auth/set-role')
      .send({ role: 'farmer' });
    expect(res.statusCode).toBe(401);
  });
});

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────
describe('PUT /api/auth/profile', () => {
  test('✅ Update name and village → 200', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ name: 'Updated Farmer', village: 'New Village' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.name).toBe('Updated Farmer');
    expect(res.body.user.village).toBe('New Village');
  });

  test('✅ Update skills string → 200', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ skills: JSON.stringify(['Harvesting', 'Sowing']) });
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'Hacker' });
    expect(res.statusCode).toBe(401);
  });
});
