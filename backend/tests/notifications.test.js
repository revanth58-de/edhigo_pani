const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');
const { createNotification } = require('../src/services/pushNotification');

describe('Notification API & Service Tests', () => {
  let testData;

  beforeAll(async () => {
    testData = await createTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  beforeEach(async () => {
    await prisma.notification.deleteMany({});
  });

  describe('DB Service - createNotification', () => {
    test('✅ Saves notification log in the database', async () => {
      const notif = await createNotification(
        testData.worker.id,
        'Test Alert',
        'Hello World from tests',
        { screen: 'JobOffer', jobId: 'xyz' }
      );

      expect(notif).toBeDefined();
      expect(notif.title).toBe('Test Alert');
      expect(notif.body).toBe('Hello World from tests');
      expect(notif.isRead).toBe(false);
      expect(notif.data).toEqual({ screen: 'JobOffer', jobId: 'xyz' });

      // Verify db persistence
      const count = await prisma.notification.count({
        where: { userId: testData.worker.id },
      });
      expect(count).toBe(1);
    });
  });

  describe('GET /api/notifications', () => {
    test('❌ Rejects unauthenticated requests', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    test('✅ Returns empty list when no notifications exist', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notifications).toEqual([]);
      expect(res.body.unreadCount).toBe(0);
    });

    test('✅ Returns list of notifications sorted by date desc', async () => {
      // Seed some notifications
      await createNotification(testData.worker.id, 'Alert 1', 'First');
      await new Promise((resolve) => setTimeout(resolve, 50));
      await createNotification(testData.worker.id, 'Alert 2', 'Second');

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBe(2);
      expect(res.body.notifications[0].title).toBe('Alert 2'); // Newest first
      expect(res.body.notifications[1].title).toBe('Alert 1');
      expect(res.body.unreadCount).toBe(2);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    test('✅ Marks single notification as read', async () => {
      const notif = await createNotification(testData.worker.id, 'Test', 'Body');

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.isRead).toBe(true);

      const dbNotif = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(dbNotif.isRead).toBe(true);
    });

    test('❌ Rejects if marking someone else\'s notification', async () => {
      const notif = await createNotification(testData.farmer.id, 'Farmer Alert', 'Body');

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/notifications/read-all', () => {
    test('✅ Marks all notifications for user as read', async () => {
      await createNotification(testData.worker.id, '1', '1');
      await createNotification(testData.worker.id, '2', '2');
      await createNotification(testData.farmer.id, '3', '3'); // Other user

      const res = await request(app)
        .post('/api/notifications/read-all')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2); // Only worker's notifications updated

      const workerUnread = await prisma.notification.count({
        where: { userId: testData.worker.id, isRead: false },
      });
      expect(workerUnread).toBe(0);

      const farmerUnread = await prisma.notification.count({
        where: { userId: testData.farmer.id, isRead: false },
      });
      expect(farmerUnread).toBe(1);
    });
  });

  describe('DELETE /api/notifications', () => {
    test('❌ Rejects unauthenticated requests', async () => {
      const res = await request(app).delete('/api/notifications');
      expect(res.status).toBe(401);
    });

    test('✅ Deletes all notifications for current user', async () => {
      await createNotification(testData.worker.id, 'Worker Alert 1', 'Body 1');
      await createNotification(testData.worker.id, 'Worker Alert 2', 'Body 2');
      await createNotification(testData.farmer.id, 'Farmer Alert', 'Body 3'); // Other user

      const res = await request(app)
        .delete('/api/notifications')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);

      const workerCount = await prisma.notification.count({
        where: { userId: testData.worker.id },
      });
      expect(workerCount).toBe(0);

      const farmerCount = await prisma.notification.count({
        where: { userId: testData.farmer.id },
      });
      expect(farmerCount).toBe(1);
    });
  });
});

