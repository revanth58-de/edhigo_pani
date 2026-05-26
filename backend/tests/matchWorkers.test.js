const prisma = require('../src/config/database');
const { matchWorkers } = require('../src/services/matchWorkers');

const TEST_PHONE_PREFIX = '9999998';

describe('matchWorkers - Customizable Matching Radius (B10)', () => {
  let farmer;
  let worker5km;
  let worker15km;
  let worker25km;

  beforeAll(async () => {
    // Clean up leftovers first
    await cleanup();

    // Create test farmer
    farmer = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}001`,
        name: 'Test Farmer B10',
        role: 'farmer',
        village: 'Test Village',
        matchingRadius: null,
      },
    });

    // Create worker 5km away (lat delta of 0.045 ~ 5km)
    worker5km = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}002`,
        name: 'Worker 5km',
        role: 'worker',
        status: 'available',
        location: {
          create: {
            latitude: 17.43,
            longitude: 78.4867,
          },
        },
      },
    });

    // Create worker 15km away (lat delta of 0.135 ~ 15km)
    worker15km = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}003`,
        name: 'Worker 15km',
        role: 'worker',
        status: 'available',
        location: {
          create: {
            latitude: 17.52,
            longitude: 78.4867,
          },
        },
      },
    });

    // Create worker 25km away (lat delta of 0.225 ~ 25km)
    worker25km = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}004`,
        name: 'Worker 25km',
        role: 'worker',
        status: 'available',
        location: {
          create: {
            latitude: 17.61,
            longitude: 78.4867,
          },
        },
      },
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  async function cleanup() {
    await prisma.userLocation.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } },
    });
    await prisma.user.deleteMany({
      where: { phone: { startsWith: TEST_PHONE_PREFIX } },
    });
    await prisma.$disconnect();
  }

  it('should fall back to 10km default if radius is not configured anywhere', async () => {
    const job = {
      farmerId: farmer.id,
      workType: 'labour',
      workerType: 'individual',
      workersNeeded: 1,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    const matchedIds = matches.map((m) => m.id);

    // Only 5km worker should match (15km and 25km are beyond the default 10km)
    expect(matchedIds).toContain(worker5km.id);
    expect(matchedIds).not.toContain(worker15km.id);
    expect(matchedIds).not.toContain(worker25km.id);
  });

  it('should respect the farmer preference (matchingRadius) if job radius is not specified', async () => {
    // Update farmer matching radius to 20km
    await prisma.user.update({
      where: { id: farmer.id },
      data: { matchingRadius: 20 },
    });

    const job = {
      farmerId: farmer.id,
      workType: 'labour',
      workerType: 'individual',
      workersNeeded: 1,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    const matchedIds = matches.map((m) => m.id);

    // 5km and 15km workers should match (25km is beyond 20km)
    expect(matchedIds).toContain(worker5km.id);
    expect(matchedIds).toContain(worker15km.id);
    expect(matchedIds).not.toContain(worker25km.id);
  });

  it('should prioritize the job radius over the farmer preference', async () => {
    // Farmer matching radius is 20km, but job radius is 30km
    const job = {
      farmerId: farmer.id,
      radiusKm: 30,
      workType: 'labour',
      workerType: 'individual',
      workersNeeded: 1,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    const matchedIds = matches.map((m) => m.id);

    // All three workers should match
    expect(matchedIds).toContain(worker5km.id);
    expect(matchedIds).toContain(worker15km.id);
    expect(matchedIds).toContain(worker25km.id);
  });

  it('should prioritize a smaller job radius over farmer preference', async () => {
    // Farmer matching radius is 20km, but job radius is 3km
    const job = {
      farmerId: farmer.id,
      radiusKm: 3,
      workType: 'labour',
      workerType: 'individual',
      workersNeeded: 1,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    const matchedIds = matches.map((m) => m.id);

    // None should match (nearest is 5km away, which is beyond 3km)
    expect(matchedIds.length).toBe(0);
  });
});
