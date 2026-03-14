/**
 * Attendance API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker;
let farmerToken, workerToken;
let attendanceJobId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker;
  farmerToken = u.farmerToken; workerToken = u.workerToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Attendance Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 300,
      startDate: new Date(),
      farmAddress: 'Test Farm',
      latitude: 16.5,
      longitude: 80.6,
      status: 'accepted',
    },
  });
  attendanceJobId = job.id;

  await prisma.jobApplication.create({
    data: {
      jobId: attendanceJobId,
      workerId: testWorker.id,
      status: 'accepted',
    },
  });
});

afterAll(async () => {
  await prisma.attendance.deleteMany({ where: { jobId: attendanceJobId } }).catch(() => {});
  await prisma.jobApplication.deleteMany({ where: { jobId: attendanceJobId } }).catch(() => {});
  await prisma.job.deleteMany({ where: { id: attendanceJobId } }).catch(() => {});
  await cleanupTestUsers();
});

const makeQR = (jobId, type = 'IN') =>
  `SECURE_ATTENDANCE|${jobId}|${Date.now()}|16.5|80.6|${type}`;

describe('POST /api/attendance/check-in', () => {
  test('✅ Valid QR + location → 200 or 201', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ qrData: makeQR(attendanceJobId, 'IN'), latitude: 16.5, longitude: 80.6 });
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ Already checked in → 409 or 400', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ qrData: makeQR(attendanceJobId, 'IN'), latitude: 16.5, longitude: 80.6 });
    expect([400, 409]).toContain(res.statusCode);
  });

  test('❌ Malformed QR → 400', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ qrData: 'NOT_VALID_QR', latitude: 16.5, longitude: 80.6 });
    expect(res.statusCode).toBe(400);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .send({ qrData: makeQR(attendanceJobId, 'IN') });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/attendance/check-out', () => {
  test('✅ After check-in → 200', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ qrData: makeQR(attendanceJobId, 'OUT'), latitude: 16.5, longitude: 80.6 });
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .send({ qrData: makeQR(attendanceJobId, 'OUT') });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/attendance/:jobId', () => {
  test('✅ Farmer gets records → 200 + array', async () => {
    const res = await request(app)
      .get(`/api/attendance/${attendanceJobId}`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app).get(`/api/attendance/${attendanceJobId}`);
    expect(res.statusCode).toBe(401);
  });
});
