const request = require('supertest');
const prisma = require('../src/config/database');

// Mock Prisma client methods specifically
jest.spyOn(prisma, '$queryRaw').mockResolvedValue([{ 1: 1 }]);

// Import app
const { app } = require('../src/server');

describe('Health Check Endpoint (/health)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 200 and connected status when database is reachable', async () => {
    jest.spyOn(prisma, '$queryRaw').mockResolvedValueOnce([{ 1: 1 }]);

    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.uptime).toBeDefined();
  });

  it('should return 503 and disconnected status when database query fails', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('error');
    expect(res.body.database).toBe('disconnected');
    expect(res.body.message).toBe('Connection lost');
  });
});
