/**
 * Jobs API Tests
 * Covers create, list, accept, withdraw, cancel & role guards
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker, testLeader;
let farmerToken, workerToken, leaderToken;
let testJobId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker; testLeader = u.leader;
  farmerToken = u.farmerToken; workerToken = u.workerToken; leaderToken = u.leaderToken;
});

afterAll(async () => {
  await cleanupTestUsers();
});

const createTestJob = (token) =>
  request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      workType: 'Harvesting',
      description: 'Test harvest job',
      workersNeeded: 2,
      payPerDay: 500,
      startDate: new Date(Date.now() + 86400000).toISOString(),
      farmAddress: 'Test Farm, Test Village',
      latitude: 16.5,
      longitude: 80.6,
    });

describe('POST /api/jobs', () => {
  test('✅ Farmer creates job → 201', async () => {
    const res = await createTestJob(farmerToken);
    expect(res.statusCode).toBe(201);
    expect(res.body.job).toHaveProperty('id');
    testJobId = res.body.job.id;
  });

  test('❌ Worker tries to create job → 403', async () => {
    const res = await createTestJob(workerToken);
    expect(res.statusCode).toBe(403);
  });

  test('❌ Missing required fields → 400', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({ workType: 'Harvesting' });
    expect(res.statusCode).toBe(400);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app).post('/api/jobs').send({ workType: 'Harvesting' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/jobs', () => {
  test('✅ Returns paginated list → 200', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });

  test('✅ Filter by status=open → only open jobs', async () => {
    const res = await request(app)
      .get('/api/jobs?status=open')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
    res.body.jobs.forEach((j) => expect(j.status).toBe('open'));
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/jobs/my-jobs', () => {
  test('✅ Farmer sees only their own jobs', async () => {
    const res = await request(app)
      .get('/api/jobs/my-jobs')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.jobs)).toBe(true);
    res.body.jobs.forEach((j) => expect(j.farmerId).toBe(testFarmer.id));
  });
});

describe('GET /api/jobs/worker-history', () => {
  test('✅ Worker history returns 200', async () => {
    const res = await request(app)
      .get('/api/jobs/worker-history')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });
});

describe('GET /api/jobs/:id', () => {
  test('✅ Valid ID → 200 + job details', async () => {
    if (!testJobId) return;
    const res = await request(app)
      .get(`/api/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.job.id).toBe(testJobId);
  });

  test('❌ Non-existent ID → 404', async () => {
    const res = await request(app)
      .get('/api/jobs/non-existent-id-99999')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/jobs/:id/accept', () => {
  test('✅ Worker accepts open job → 200', async () => {
    if (!testJobId) return;
    const res = await request(app)
      .post(`/api/jobs/${testJobId}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ Farmer tries to accept job → 403', async () => {
    if (!testJobId) return;
    const res = await request(app)
      .post(`/api/jobs/${testJobId}/accept`)
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({});
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /api/jobs/:id/withdraw', () => {
  test('✅ Worker withdraws from accepted job → 200', async () => {
    if (!testJobId) return;
    const res = await request(app)
      .post(`/api/jobs/${testJobId}/withdraw`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({});
    expect([200, 204]).toContain(res.statusCode);
  });
});

describe('GET /api/jobs/nearby-workers', () => {
  test('✅ Returns workers list → 200', async () => {
    const res = await request(app)
      .get('/api/jobs/nearby-workers?lat=16.5&lng=80.6&radius=50')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.workers)).toBe(true);
  });
});

describe('DELETE /api/jobs/:id', () => {
  test('✅ Farmer cancels own job → 200', async () => {
    const createRes = await createTestJob(farmerToken);
    const jobToDelete = createRes.body.job?.id;
    if (!jobToDelete) return;
    const res = await request(app)
      .delete(`/api/jobs/${jobToDelete}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect([200, 204]).toContain(res.statusCode);
  });

  test('❌ Worker tries to cancel → 403', async () => {
    if (!testJobId) return;
    const res = await request(app)
      .delete(`/api/jobs/${testJobId}`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(403);
  });
});
