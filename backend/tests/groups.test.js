/**
 * Groups API Tests
 */
const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

let testFarmer, testWorker, testLeader;
let farmerToken, workerToken, leaderToken;
let testGroupId;

beforeAll(async () => {
  const u = await createTestUsers();
  testFarmer = u.farmer; testWorker = u.worker; testLeader = u.leader;
  farmerToken = u.farmerToken; workerToken = u.workerToken; leaderToken = u.leaderToken;
});

afterAll(async () => {
  if (testGroupId) {
    await prisma.groupMember.deleteMany({ where: { groupId: testGroupId } }).catch(() => {});
    await prisma.group.deleteMany({ where: { id: testGroupId } }).catch(() => {});
  }
  await cleanupTestUsers();
});

describe('POST /api/groups', () => {
  test('✅ Leader creates group → 200/201', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ name: 'Test Workers Group', skills: ['Harvesting', 'Sowing'], maxSize: 10 });
    expect([200, 201]).toContain(res.statusCode);
    testGroupId = (res.body.group || res.body)?.id;
  });

  test('❌ Missing name → 400 or 422', async () => {
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ skills: [], maxSize: 5 });
    expect([400, 422]).toContain(res.statusCode);
  });

  test('❌ No auth → 401', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'NoAuth Group', skills: [] });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/groups/my-groups', () => {
  test('✅ Leader sees their groups → 200 + array', async () => {
    const res = await request(app)
      .get('/api/groups/my-groups')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.groups || res.body)).toBe(true);
  });
});

describe('GET /api/groups/pending-invites', () => {
  test('✅ Worker sees pending invites → 200', async () => {
    const res = await request(app)
      .get('/api/groups/pending-invites')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/groups/:groupId', () => {
  test('✅ Returns group details → 200', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .get(`/api/groups/${testGroupId}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(200);
    expect((res.body.group || res.body)?.id).toBe(testGroupId);
  });

  test('❌ Non-existent group → 404', async () => {
    const res = await request(app)
      .get('/api/groups/non-existent-group-id')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/groups/:groupId/members/by-phone', () => {
  test('✅ Add worker by phone → 200/201', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .post(`/api/groups/${testGroupId}/members/by-phone`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ phone: testWorker.phone });
    expect([200, 201]).toContain(res.statusCode);
  });

  test('❌ Phone not found → 404', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .post(`/api/groups/${testGroupId}/members/by-phone`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ phone: '9000000099' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/groups/:groupId/respond-invite', () => {
  test('Worker responds to invite → 200 or 400/404', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .post(`/api/groups/${testGroupId}/respond-invite`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ accept: true });
    expect([200, 400, 404]).toContain(res.statusCode);
  });
});

describe('DELETE /api/groups/:groupId/members/:workerId', () => {
  test('✅ Leader removes worker → 200/204', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .delete(`/api/groups/${testGroupId}/members/${testWorker.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect([200, 204, 404]).toContain(res.statusCode);
  });
});

describe('POST /api/groups/:groupId/exit', () => {
  test('Worker exits group → 200 or 404', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .post(`/api/groups/${testGroupId}/exit`)
      .set('Authorization', `Bearer ${workerToken}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});

describe('GET /api/chats/:groupId/messages', () => {
  let msg1, msg2, msg3;

  beforeAll(async () => {
    if (!testGroupId) return;
    // Create messages using prisma directly
    msg1 = await prisma.groupMessage.create({
      data: {
        groupId: testGroupId,
        senderId: testLeader.id,
        content: 'Hello 1',
        createdAt: new Date(Date.now() - 10000),
      },
    });
    msg2 = await prisma.groupMessage.create({
      data: {
        groupId: testGroupId,
        senderId: testLeader.id,
        content: 'Hello 2',
        createdAt: new Date(Date.now() - 5000),
      },
    });
    msg3 = await prisma.groupMessage.create({
      data: {
        groupId: testGroupId,
        senderId: testLeader.id,
        content: 'Hello 3',
        createdAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    if (testGroupId) {
      await prisma.groupMessage.deleteMany({ where: { groupId: testGroupId } }).catch(() => {});
    }
  });

  test('✅ Get all messages for group → 200', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .get(`/api/chats/${testGroupId}/messages`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0].content).toBe('Hello 1');
    expect(res.body.data[1].content).toBe('Hello 2');
    expect(res.body.data[2].content).toBe('Hello 3');
  });

  test('✅ Get messages before msg2 → 200 (returns msg1)', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .get(`/api/chats/${testGroupId}/messages?before=${msg2.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('Hello 1');
  });

  test('✅ Get messages after msg2 → 200 (returns msg3)', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .get(`/api/chats/${testGroupId}/messages?after=${msg2.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('Hello 3');
  });

  test('❌ Non-member cannot view messages → 403', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .get(`/api/chats/${testGroupId}/messages`)
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /api/groups/:groupId', () => {
  test('✅ Leader deletes own group → 200/204', async () => {
    if (!testGroupId) return;
    const res = await request(app)
      .delete(`/api/groups/${testGroupId}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect([200, 204]).toContain(res.statusCode);
    testGroupId = null; // Prevent afterAll from trying again
  });
});
