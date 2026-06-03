const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker;
let farmerToken, workerToken;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer;
  testWorker = u.worker;
  farmerToken = u.farmerToken;
  workerToken = u.workerToken;
});

afterAll(async () => {
  await cleanupTestUsers();
});

describe('GET /api/workers/earnings/pdf', () => {
  test('❌ No auth → 401', async () => {
    const res = await request(app).get('/api/workers/earnings/pdf');
    expect(res.statusCode).toBe(401);
  });

  test('✅ Authenticated with Bearer Header → 200 application/pdf', async () => {
    const res = await request(app)
      .get('/api/workers/earnings/pdf')
      .set('Authorization', `Bearer ${workerToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('earnings_certificate');
    expect(res.body).toBeDefined();
  });

  test('✅ Authenticated with Token Query Parameter → 200 application/pdf', async () => {
    const res = await request(app)
      .get(`/api/workers/earnings/pdf?token=${workerToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeDefined();
  });
});
