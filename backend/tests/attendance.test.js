/**
 * Attendance API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker, testLeader;
let farmerToken, workerToken, leaderToken;
let attendanceJobId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker; testLeader = u.leader;
  farmerToken = u.farmerToken; workerToken = u.workerToken; leaderToken = u.leaderToken;

  const job = await prisma.job.create({
    data: {
      workType: 'Attendance Test Job',
      farmerId: testFarmer.id,
      workersNeeded: 1,
      payPerDay: 300,
      startTime: new Date(),
      farmAddress: 'Test Farm',
      farmLatitude: 16.5,
      farmLongitude: 80.6,
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

describe('Group Collective Attendance Check-In and Check-Out', () => {
  let group;

  beforeAll(async () => {
    // Create a group with testLeader
    group = await prisma.group.create({
      data: {
        leaderId: testLeader.id,
        name: 'Collective Group',
        maxMembers: 10,
        status: 'active'
      }
    });

    // Add testWorker as a joined member of this group
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        workerId: testWorker.id,
        status: 'joined',
        joinedAt: new Date()
      }
    });
  });

  afterAll(async () => {
    if (group) {
      await prisma.groupMember.deleteMany({ where: { groupId: group.id } }).catch(() => {});
      await prisma.group.delete({ where: { id: group.id } }).catch(() => {});
    }
  });

  test('✅ Group Leader Check-In checks in all joined members', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        jobId: attendanceJobId,
        groupId: group.id,
        qrData: makeQR(attendanceJobId, 'IN'),
        latitude: 16.5,
        longitude: 80.6
      });

    expect([200, 201]).toContain(res.statusCode);

    // Verify attendances are created for both leader and worker
    const attendances = await prisma.attendance.findMany({
      where: { jobId: attendanceJobId, checkOut: null }
    });
    const checkedInWorkerIds = attendances.map(a => a.workerId);
    expect(checkedInWorkerIds).toContain(testLeader.id);
    expect(checkedInWorkerIds).toContain(testWorker.id);

    // Verify user statuses are updated to 'working'
    const leaderUser = await prisma.user.findUnique({ where: { id: testLeader.id } });
    const workerUser = await prisma.user.findUnique({ where: { id: testWorker.id } });
    expect(leaderUser.status).toBe('working');
    expect(workerUser.status).toBe('working');

    // Verify group member status is 'checked_in'
    const member = await prisma.groupMember.findUnique({
      where: { groupId_workerId: { groupId: group.id, workerId: testWorker.id } }
    });
    expect(member.status).toBe('checked_in');
  });

  test('✅ Group Leader Check-Out checks out all checked_in members', async () => {
    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        jobId: attendanceJobId,
        groupId: group.id,
        qrData: makeQR(attendanceJobId, 'OUT'),
        latitude: 16.5,
        longitude: 80.6
      });

    expect(res.statusCode).toBe(200);

    // Verify attendances are updated with checkOut times
    const activeAttendances = await prisma.attendance.findMany({
      where: { jobId: attendanceJobId, checkOut: null }
    });
    expect(activeAttendances.length).toBe(0);

    // Verify user statuses are updated to 'available'
    const leaderUser = await prisma.user.findUnique({ where: { id: testLeader.id } });
    const workerUser = await prisma.user.findUnique({ where: { id: testWorker.id } });
    expect(leaderUser.status).toBe('available');
    expect(workerUser.status).toBe('available');

    // Verify group member status is 'checked_out'
    const member = await prisma.groupMember.findUnique({
      where: { groupId_workerId: { groupId: group.id, workerId: testWorker.id } }
    });
    expect(member.status).toBe('checked_out');
  });
});
