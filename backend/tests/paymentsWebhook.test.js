/**
 * Razorpay Integration & Webhook API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker;
let farmerToken, workerToken;
let testJobId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer;
  testWorker = u.worker;
  farmerToken = u.farmerToken;
  workerToken = u.workerToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Webhook Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 500,
      startTime: new Date(),
      farmAddress: 'Webhook Farm',
      farmLatitude: 16.5,
      farmLongitude: 80.6,
      status: 'completed',
    },
  });
  testJobId = job.id;

  await prisma.jobApplication.create({
    data: { jobId: testJobId, workerId: testWorker.id, status: 'accepted' },
  });
});

afterAll(async () => {
  await prisma.settlement.deleteMany({ where: { workerId: testWorker.id } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
  await prisma.jobApplication.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
  await prisma.job.deleteMany({ where: { id: testJobId } }).catch(() => {});
  await cleanupTestUsers();
});

describe('Razorpay Order & Verification Endpoints', () => {
  let createdOrderId;

  test('✅ Create Razorpay Order → 201', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/order')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        jobId: testJobId,
        amount: 500,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.amount).toBe(50000); // 500 * 100 paise
    createdOrderId = res.body.order.id;
  });

  test('❌ Create Order with missing amount → 400', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/order')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: testJobId });

    expect(res.statusCode).toBe(400);
  });

  test('✅ Verify Razorpay Payment (Dev/Test Signature) → 200', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        razorpay_order_id: createdOrderId || 'order_mock_123',
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'dev_signature',
        jobId: testJobId,
        amount: 500,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('✅ Record Client Payment Failure → 200', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/failure')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        jobId: testJobId,
        error: { code: 'BAD_REQUEST_ERROR', description: 'User cancelled payment' },
        razorpay_order_id: createdOrderId,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/payments/razorpay/webhook', () => {
  test('✅ Handles order.paid webhook event → 200', async () => {
    const webhookPayload = {
      event: 'order.paid',
      payload: {
        payment: {
          entity: {
            id: `pay_hook_${Date.now()}`,
            amount: 50000,
            notes: {
              jobId: testJobId,
            },
          },
        },
        order: {
          entity: {
            id: `order_hook_${Date.now()}`,
            amount: 50000,
            receipt: testJobId,
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/payments/razorpay/webhook')
      .send(webhookPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
  });

  test('✅ Handles payment.failed webhook event → 200', async () => {
    const webhookPayload = {
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            error_code: 'PAYMENT_DECLINED',
            error_description: 'Bank server timeout',
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/payments/razorpay/webhook')
      .send(webhookPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.received).toBe(true);
  });

  test('❌ Webhook missing event → 400', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/webhook')
      .send({});

    expect(res.statusCode).toBe(400);
  });
});
