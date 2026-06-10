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
    await prisma.groupMember.deleteMany({
      where: { group: { leader: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
    }).catch(() => {});
    await prisma.group.deleteMany({
      where: { leader: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    }).catch(() => {});
    await prisma.userLocation.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } },
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { phone: { startsWith: TEST_PHONE_PREFIX } },
    }).catch(() => {});
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

describe('matchWorkers - Group Size Matching (including Leader)', () => {
  let farmer;
  let leader;
  let member1, member2, member3;
  let group;

  beforeAll(async () => {
    // Farmer
    farmer = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}050`,
        name: 'Farmer Test',
        role: 'farmer',
        village: 'Test Village',
      }
    });

    // Leader
    leader = await prisma.user.create({
      data: {
        phone: `${TEST_PHONE_PREFIX}051`,
        name: 'Leader Test',
        role: 'leader',
        status: 'available',
        location: {
          create: {
            latitude: 17.385,
            longitude: 78.4867,
          }
        }
      }
    });

    // Members
    member1 = await prisma.user.create({ data: { phone: `${TEST_PHONE_PREFIX}052`, name: 'M1', role: 'worker' } });
    member2 = await prisma.user.create({ data: { phone: `${TEST_PHONE_PREFIX}053`, name: 'M2', role: 'worker' } });
    member3 = await prisma.user.create({ data: { phone: `${TEST_PHONE_PREFIX}054`, name: 'M3', role: 'worker' } });

    // Group
    group = await prisma.group.create({
      data: {
        leaderId: leader.id,
        name: 'Test Group for Match',
        maxMembers: 10,
        status: 'available',
      }
    });

    // Add 3 joined members
    await prisma.groupMember.createMany({
      data: [
        { groupId: group.id, workerId: member1.id, status: 'joined' },
        { groupId: group.id, workerId: member2.id, status: 'joined' },
        { groupId: group.id, workerId: member3.id, status: 'joined' },
      ]
    });
  });

  afterAll(async () => {
    // Already cleaned up in main afterAll, but keep it clean
  });

  it('should match group with workersNeeded = 4 (3 members + 1 leader)', async () => {
    const job = {
      farmerId: farmer.id,
      workType: 'labour',
      workerType: 'group',
      workersNeeded: 4,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(leader.id);
    expect(matches[0].memberCount).toBe(4); // 3 members + 1 leader = 4
  });

  it('should not match group with workersNeeded = 5', async () => {
    const job = {
      farmerId: farmer.id,
      workType: 'labour',
      workerType: 'group',
      workersNeeded: 5,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    expect(matches.length).toBe(0);
  });

  it('should match group with workersNeeded = 4 even if some members are in checked_out or checked_in status', async () => {
    // Update member1's status to checked_out and member2's status to checked_in in groupMember
    const gm1 = await prisma.groupMember.findFirst({ where: { groupId: group.id, workerId: member1.id } });
    const gm2 = await prisma.groupMember.findFirst({ where: { groupId: group.id, workerId: member2.id } });
    
    await prisma.groupMember.update({
      where: { id: gm1.id },
      data: { status: 'checked_out' }
    });
    await prisma.groupMember.update({
      where: { id: gm2.id },
      data: { status: 'checked_in' }
    });

    const job = {
      farmerId: farmer.id,
      workType: 'labour',
      workerType: 'group',
      workersNeeded: 4,
      farmLatitude: 17.385,
      farmLongitude: 78.4867,
    };

    const matches = await matchWorkers(job);
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe(leader.id);
    expect(matches[0].memberCount).toBe(4); // 3 members (joined, checked_in, checked_out) + 1 leader = 4

    // Restore status to joined for other tests
    await prisma.groupMember.updateMany({
      where: { groupId: group.id },
      data: { status: 'joined' }
    });
  });
});
