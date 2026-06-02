const request = require('supertest');
const { app } = require('../src/server');
const prisma = require('../src/config/database');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

describe('Machinery API & Booking Tests', () => {
  let testData;

  beforeAll(async () => {
    testData = await createTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  beforeEach(async () => {
    await prisma.machineryBooking.deleteMany({});
    await prisma.machinery.deleteMany({});
  });

  describe('POST /api/machinery', () => {
    test('❌ Rejects unauthenticated requests', async () => {
      const res = await request(app).post('/api/machinery').send({
        type: 'Tractor',
        name: 'Sonalika DI 750',
        pricePerHour: 750,
      });
      expect(res.status).toBe(401);
    });

    test('✅ Allows authenticated user to register machinery', async () => {
      const res = await request(app)
        .post('/api/machinery')
        .set('Authorization', `Bearer ${testData.workerToken}`)
        .send({
          type: 'Tractor',
          name: 'Sonalika DI 750',
          pricePerHour: 750,
          latitude: 16.506,
          longitude: 80.648,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.machinery.name).toBe('Sonalika DI 750');
      expect(res.body.machinery.pricePerHour).toBe(750);
      expect(res.body.machinery.ownerId).toBe(testData.worker.id);

      const dbMachinery = await prisma.machinery.findUnique({
        where: { id: res.body.machinery.id },
      });
      expect(dbMachinery).toBeDefined();
    });

    test('❌ Fails if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/machinery')
        .set('Authorization', `Bearer ${testData.workerToken}`)
        .send({
          name: 'Sonalika DI 750',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/machinery/listings', () => {
    test('✅ Returns empty listing when no machines registered', async () => {
      const res = await request(app)
        .get('/api/machinery/listings')
        .set('Authorization', `Bearer ${testData.farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.listings).toEqual([]);
    });

    test('✅ Returns and sorts machines by distance when coordinates are supplied', async () => {
      // Register a close machine (approx 2km away)
      await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Tractor',
          name: 'Close Tractor',
          pricePerHour: 800,
          latitude: 16.520, // close to 16.500
          longitude: 80.650, // close to 80.600
        },
      });

      // Register a far machine (approx 20km away)
      await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Tractor',
          name: 'Far Tractor',
          pricePerHour: 600,
          latitude: 16.650,
          longitude: 80.750,
        },
      });

      // Query listings from user position 16.500, 80.600
      const res = await request(app)
        .get('/api/machinery/listings?lat=16.500&lng=80.600&type=Tractor')
        .set('Authorization', `Bearer ${testData.farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.listings.length).toBe(2);
      expect(res.body.listings[0].name).toBe('Close Tractor'); // Nearest first
      expect(res.body.listings[1].name).toBe('Far Tractor');
      expect(res.body.listings[0].distance).toBeLessThan(res.body.listings[1].distance);
    });
  });

  describe('POST /api/machinery/book', () => {
    let machine;

    beforeEach(async () => {
      machine = await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Tractor',
          name: 'John Deere 5050',
          pricePerHour: 900,
          status: 'available',
        },
      });
    });

    test('✅ Allows farmer to book machinery', async () => {
      const res = await request(app)
        .post('/api/machinery/book')
        .set('Authorization', `Bearer ${testData.farmerToken}`)
        .send({
          machineryId: machine.id,
          date: '2026-07-01',
          slot: 'Morning',
          totalAmount: 2700,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.slot).toBe('Morning');
      expect(res.body.booking.totalAmount).toBe(2700);

      const dbBooking = await prisma.machineryBooking.findFirst({
        where: { machineryId: machine.id },
      });
      expect(dbBooking).toBeDefined();
    });

    test('❌ Prevents double-booking of same slot and date', async () => {
      // First booking
      await request(app)
        .post('/api/machinery/book')
        .set('Authorization', `Bearer ${testData.farmerToken}`)
        .send({
          machineryId: machine.id,
          date: '2026-07-01',
          slot: 'Morning',
          totalAmount: 2700,
        });

      // Second booking on same slot and date
      const res = await request(app)
        .post('/api/machinery/book')
        .set('Authorization', `Bearer ${testData.farmerToken}`)
        .send({
          machineryId: machine.id,
          date: '2026-07-01',
          slot: 'Morning',
          totalAmount: 2700,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already booked');
    });
  });

  describe('GET /api/machinery/bookings', () => {
    test('✅ Lists farmer bookings', async () => {
      const machine = await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Harvester',
          name: 'Combine Harvester',
          pricePerHour: 1500,
        },
      });

      await prisma.machineryBooking.create({
        data: {
          machineryId: machine.id,
          farmerId: testData.farmer.id,
          date: new Date('2026-07-15'),
          slot: 'Full Day',
          totalAmount: 12000,
        },
      });

      const res = await request(app)
        .get('/api/machinery/bookings')
        .set('Authorization', `Bearer ${testData.farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bookings.length).toBe(1);
      expect(res.body.bookings[0].slot).toBe('Full Day');
      expect(res.body.bookings[0].machinery.name).toBe('Combine Harvester');
      expect(res.body.bookings[0].machinery.owner.name).toBe('Test Worker');
    });
  });

  describe('GET /api/machinery/owner/listings', () => {
    test('✅ Returns owner listings', async () => {
      await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Tractor',
          name: 'My Tractor',
          pricePerHour: 900,
        },
      });

      const res = await request(app)
        .get('/api/machinery/owner/listings')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.listings.length).toBe(1);
      expect(res.body.listings[0].name).toBe('My Tractor');
    });
  });

  describe('GET /api/machinery/owner/bookings', () => {
    test('✅ Returns owner bookings and verifies owner notification created', async () => {
      const machine = await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Harvester',
          name: 'Combine Harvester',
          pricePerHour: 1500,
        },
      });

      // Clear notifications first
      await prisma.notification.deleteMany({});

      // Make booking
      const bookRes = await request(app)
        .post('/api/machinery/book')
        .set('Authorization', `Bearer ${testData.farmerToken}`)
        .send({
          machineryId: machine.id,
          date: '2026-08-01',
          slot: 'Afternoon',
          totalAmount: 9000,
        });
      expect(bookRes.status).toBe(201);

      // Verify owner bookings endpoint works
      const res = await request(app)
        .get('/api/machinery/owner/bookings')
        .set('Authorization', `Bearer ${testData.workerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bookings.length).toBe(1);
      expect(res.body.bookings[0].slot).toBe('Afternoon');
      expect(res.body.bookings[0].farmer.name).toBe('Test Farmer');

      // Verify database notification was created for owner
      const notif = await prisma.notification.findFirst({
        where: { userId: testData.worker.id },
      });
      expect(notif).toBeDefined();
      expect(notif.title).toContain('Machinery Booking');
      expect(notif.body).toContain('Combine Harvester');
    });
  });

  describe('PATCH /api/machinery/bookings/:bookingId/status', () => {
    test('✅ Allows machinery owner to confirm/cancel booking and notifies farmer', async () => {
      const machine = await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Harvester',
          name: 'Combine Harvester',
          pricePerHour: 1500,
        },
      });

      const booking = await prisma.machineryBooking.create({
        data: {
          machineryId: machine.id,
          farmerId: testData.farmer.id,
          date: new Date('2026-08-10'),
          slot: 'Morning',
          totalAmount: 9000,
        },
      });

      // Clear notifications first
      await prisma.notification.deleteMany({});

      // Update status to confirmed
      const res = await request(app)
        .patch(`/api/machinery/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${testData.workerToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.status).toBe('confirmed');

      // Verify notification was created for farmer
      const notif = await prisma.notification.findFirst({
        where: { userId: testData.farmer.id },
      });
      expect(notif).toBeDefined();
      expect(notif.title).toContain('Booking Confirmed');
      expect(notif.body).toContain('Combine Harvester');
    });

    test('❌ Rejects update if unauthorized', async () => {
      const machine = await prisma.machinery.create({
        data: {
          ownerId: testData.worker.id,
          type: 'Harvester',
          name: 'Combine Harvester',
          pricePerHour: 1500,
        },
      });

      const booking = await prisma.machineryBooking.create({
        data: {
          machineryId: machine.id,
          farmerId: testData.farmer.id,
          date: new Date('2026-08-10'),
          slot: 'Morning',
          totalAmount: 9000,
        },
      });

      // Farmer tries to update status of booking on worker's machine
      const res = await request(app)
        .patch(`/api/machinery/bookings/${booking.id}/status`)
        .set('Authorization', `Bearer ${testData.farmerToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
    });
  });
});
