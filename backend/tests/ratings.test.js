/**
 * Ratings API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker;
let farmerToken, workerToken;
let ratingJobId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker;
  farmerToken = u.farmerToken; workerToken = u.workerToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Rating Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 300,
      startDate: new Date(),
      farmAddress: 'Test Farm',
      latitude: 16.5,
      longitude: 80.6,
      status: 'completed',
    },
  });
  ratingJobId = job.id;
});

afterAll(async () => {
  await prisma.rating.deleteMany({ where: { jobId: ratingJobId } }).catch(() => {});
  await prisma.job.deleteMany({ where: { id: ratingJobId } }).catch(() => {});
  await cleanupTestUsers();
});

describe('POST /api/ratings/worker', () => {
  test('✅ Farmer rates worker (4 stars) → 200/201', async () => {
    const res = await request(app)
      .post('/api/ratings/worker')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: ratingJobId, rateeId: testWorker.id, rating: 4, feedback: 'Good work!' });
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ rating=0 → 400 (boundary)', async () => {
    const res = await request(app)
      .post('/api/ratings/worker')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: ratingJobId, rateeId: testWorker.id, rating: 0 });
    expect(res.statusCode).toBe(400);
  });

  test('❌ rating=6 → 400 (boundary)', async () => {
    const res = await request(app)
      .post('/api/ratings/worker')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ jobId: ratingJobId, rateeId: testWorker.id, rating: 6 });
    expect(res.statusCode).toBe(400);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .post('/api/ratings/worker')
      .send({ jobId: ratingJobId, rateeId: testWorker.id, rating: 3 });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/ratings/farmer', () => {
  test('✅ Worker rates farmer → 200/201', async () => {
    const res = await request(app)
      .post('/api/ratings/farmer')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ jobId: ratingJobId, rateeId: testFarmer.id, rating: 5, feedback: 'Great!' });
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ Missing rateeId → 400', async () => {
    const res = await request(app)
      .post('/api/ratings/farmer')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ jobId: ratingJobId, rating: 3 });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/ratings/user/:userId', () => {
  test('✅ Get worker ratings → 200 + array', async () => {
    const res = await request(app)
      .get(`/api/ratings/user/${testWorker.id}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app).get(`/api/ratings/user/${testWorker.id}`);
    expect(res.statusCode).toBe(401);
  });
});
