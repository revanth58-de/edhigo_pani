/**
 * Payments API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker, testLeader;
let farmerToken, workerToken, leaderToken;
let paymentJobId, createdPaymentId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker; testLeader = u.leader;
  farmerToken = u.farmerToken; workerToken = u.workerToken; leaderToken = u.leaderToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Payment Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 400,
      startTime: new Date(),
      farmAddress: 'Test Farm',
      farmLatitude: 16.5,
      farmLongitude: 80.6,
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
      .send({
        jobId: paymentJobId,
        workerId: testWorker.id,
        amount: 400,
        method: 'cash',
        notes: 'Test cash notes',
        receiptUrl: 'http://example.com/receipt.jpg'
      });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.payments).toBeDefined();
    expect(res.body.payments.length).toBeGreaterThan(0);
    const firstPayment = res.body.payments[0];
    expect(firstPayment.notes).toBe('Test cash notes');
    expect(firstPayment.receiptUrl).toBe('http://example.com/receipt.jpg');
    createdPaymentId = firstPayment.id;
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

describe('Auto Group Payment Splits', () => {
  let groupJobId;

  beforeAll(async () => {
    // Create a new job with workersNeeded: 2, payPerDay: 400
    const job = await prisma.job.create({
      data: {
        workType: 'Group Payment Job',
        farmerId: testFarmer.id,
        workersNeeded: 2,
        payPerDay: 400,
        startTime: new Date(),
        farmAddress: 'Test Farm',
        farmLatitude: 16.5,
        farmLongitude: 80.6,
        status: 'completed',
      },
    });
    groupJobId = job.id;

    // Create check-in attendance records for testWorker and testLeader
    await prisma.attendance.createMany({
      data: [
        {
          jobId: groupJobId,
          workerId: testWorker.id,
          qrCodeIn: 'SECURE_ATTENDANCE|IN',
          checkIn: new Date(),
          checkInLatitude: 16.5,
          checkInLongitude: 80.6,
        },
        {
          jobId: groupJobId,
          workerId: testLeader.id,
          qrCodeIn: 'SECURE_ATTENDANCE|IN',
          checkIn: new Date(),
          checkInLatitude: 16.5,
          checkInLongitude: 80.6,
        },
      ],
    });
  });

  afterAll(async () => {
    if (groupJobId) {
      await prisma.payment.deleteMany({ where: { jobId: groupJobId } }).catch(() => {});
      await prisma.attendance.deleteMany({ where: { jobId: groupJobId } }).catch(() => {});
      await prisma.jobApplication.deleteMany({ where: { jobId: groupJobId } }).catch(() => {});
      await prisma.job.delete({ where: { id: groupJobId } }).catch(() => {});
    }
  });

  test('✅ Farmer pays group job → splits amount equally among all checked-in workers', async () => {
    const totalAmount = 800; // Total payment amount
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        jobId: groupJobId,
        amount: totalAmount,
        method: 'cash',
        notes: 'Group split payment test',
      });

    expect([200, 201]).toContain(res.statusCode);
    expect(res.body.payments).toBeDefined();
    expect(res.body.payments.length).toBe(2);

    // Verify payments are split equally (800 / 2 = 400 per worker)
    const expectedPerWorkerAmount = totalAmount / 2;
    res.body.payments.forEach(payment => {
      expect(payment.amount).toBe(expectedPerWorkerAmount);
      expect(payment.notes).toBe('Group split payment test');
      expect([testWorker.id, testLeader.id]).toContain(payment.workerId);
    });

    // Check that payments are actually saved in the DB correctly
    const dbPayments = await prisma.payment.findMany({
      where: { jobId: groupJobId }
    });
    expect(dbPayments.length).toBe(2);
    dbPayments.forEach(payment => {
      expect(payment.amount).toBe(expectedPerWorkerAmount);
    });
  });
});
