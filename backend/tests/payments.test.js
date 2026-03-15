/**
 * Payments API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker;
let farmerToken, workerToken;
let paymentJobId, createdPaymentId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker;
  farmerToken = u.farmerToken; workerToken = u.workerToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Payment Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 400,
      startDate: new Date(),
      farmAddress: 'Test Farm',
      latitude: 16.5,
      longitude: 80.6,
      status: 'completed',
    },
  });
  paymentJobId = job.id;

  await prisma.jobApplication.create({
    data: { jobId: paymentJobId, workerId: testWorker.id, status: 'accepted' },
  });
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { jobId: paymentJobId } }).catch(() => {});
  await prisma.jobApplication.deleteMany({ where: { jobId: paymentJobId } }).catch(() => {});
  await prisma.job.deleteMany({ where: { id: paymentJobId } }).catch(() => {});
  await cleanupTestUsers();
});

describe('POST /api/payments', () => {
  test('✅ Farmer pays worker → 200 or 201', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: paymentJobId, workerId: testWorker.id, amount: 400, method: 'cash' });
    expect([200, 201]).toContain(res.statusCode);
    if (res.body.payment?.id) createdPaymentId = res.body.payment.id;
  });

  test('❌ Missing jobId → 400', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ workerId: testWorker.id, amount: 400 });
    expect(res.statusCode).toBe(400);
  });

  test('❌ Missing workerId → 400', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: paymentJobId, amount: 400 });
    expect(res.statusCode).toBe(400);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .post('/api/payments')
      .send({ jobId: paymentJobId, workerId: testWorker.id, amount: 400 });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/payments/history/:userId', () => {
  test('✅ Worker sees payment history → 200', async () => {
    const res = await request(app)
      .get(`/api/payments/history/${testWorker.id}`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app).get(`/api/payments/history/${testWorker.id}`);
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/payments/:paymentId', () => {
  test('✅ Valid payment ID → 200', async () => {
    if (!createdPaymentId) { console.warn('⚠️ No payment created — skipping'); return; }
    const res = await request(app)
      .get(`/api/payments/${createdPaymentId}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('❌ Non-existent ID → 404', async () => {
    const res = await request(app)
      .get('/api/payments/non-existent-payment-id')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(404);
  });
});
