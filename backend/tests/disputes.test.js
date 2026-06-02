/**
 * Disputes API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

let testFarmer, testWorker, testAdmin;
let farmerToken, workerToken, adminToken;
let testJobId, createdPaymentId, createdDisputeId;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { phone: '+919999999901' } }).catch(() => {});
  const u = await createTestUsers();
  testFarmer = u.farmer;
  testWorker = u.worker;
  farmerToken = u.farmerToken;
  workerToken = u.workerToken;

  // Create an admin user or sign an admin token
  testAdmin = await prisma.user.findFirst({ where: { role: 'farmer' } }); // reuse farmer as mock admin
  adminToken = jwt.sign({ userId: testAdmin.id, role: 'admin' }, config.adminJwtSecret || config.jwtSecret);

  const job = await prisma.job.create({
    data: {
      workType: 'Dispute Test Job',
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
  testJobId = job.id;

  await prisma.jobApplication.create({
    data: { jobId: testJobId, workerId: testWorker.id, status: 'accepted' },
  });

  const payment = await prisma.payment.create({
    data: {
      jobId: testJobId,
      farmerId: testFarmer.id,
      workerId: testWorker.id,
      amount: 400,
      method: 'cash',
      status: 'completed',
    }
  });
  createdPaymentId = payment.id;
});

afterAll(async () => {
  await prisma.dispute.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
  await prisma.payment.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
  await prisma.jobApplication.deleteMany({ where: { jobId: testJobId } }).catch(() => {});
  await prisma.job.deleteMany({ where: { id: testJobId } }).catch(() => {});
  await cleanupTestUsers();
});

describe('POST /api/disputes', () => {
  test('✅ Worker files dispute → 201', async () => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        jobId: testJobId,
        paymentId: createdPaymentId,
        category: 'hours_mismatch',
        description: 'Hours worked were recorded incorrectly.',
      });
    if (res.statusCode !== 201) console.log('DEBUG 500 error details:', res.body);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.dispute).toBeDefined();
    createdDisputeId = res.body.dispute.id;
  });

  test('❌ Missing description → 400', async () => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        jobId: testJobId,
        category: 'hours_mismatch',
      });
    expect(res.statusCode).toBe(400);
  });

  test('❌ Uninvolved worker files dispute → 403', async () => {
    // Generate a random token for an uninvolved user
    const randomUser = await prisma.user.create({
      data: {
        phone: '+919999999901',
        name: 'Random User',
        role: 'worker',
      }
    });
    const randomToken = jwt.sign({ userId: randomUser.id }, config.jwtSecret);

    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${randomToken}`)
      .send({
        jobId: testJobId,
        category: 'other',
        description: 'I want to file a dispute anyway.',
      });
    if (res.statusCode !== 403) console.log('DEBUG 403 test failure:', res.body);
    expect(res.statusCode).toBe(403);

    // Cleanup
    await prisma.user.delete({ where: { id: randomUser.id } }).catch(() => {});
  });
});

describe('GET /api/disputes/my', () => {
  test('✅ Worker views their disputes → 200', async () => {
    const res = await request(app)
      .get('/api/disputes/my')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.disputes.length).toBeGreaterThan(0);
  });
});

describe('GET /api/disputes/job/:jobId', () => {
  test('✅ Farmer views job disputes → 200', async () => {
    const res = await request(app)
      .get(`/api/disputes/job/${testJobId}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin Disputes API', () => {
  test('✅ Admin gets disputes list → 200', async () => {
    const res = await request(app)
      .get('/api/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.disputes).toBeDefined();
  });

  test('✅ Admin updates dispute status → 200', async () => {
    if (!createdDisputeId) return;
    const res = await request(app)
      .patch(`/api/admin/disputes/${createdDisputeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved',
        resolutionDetails: 'Checked logs and adjusted worker payout.',
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.dispute.status).toBe('resolved');
    expect(res.body.dispute.resolutionDetails).toBe('Checked logs and adjusted worker payout.');
  });
});
