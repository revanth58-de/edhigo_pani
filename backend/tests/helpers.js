/**
 * tests/helpers.js — Shared test user setup
 * Each test file calls createTestUsers() in beforeAll and cleanupTestUsers() in afterAll.
 */
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/database');
const config = require('../src/config/env');

const TEST_PHONE_PREFIX = '9999999';

const makeToken = (userId) =>
  jwt.sign({ userId }, config.jwtSecret, { expiresIn: '1h' });

async function createTestUsers() {
  // Clean any leftovers first
  await cleanupTestUsers();

  const farmer = await prisma.user.create({
    data: {
      phone: `${TEST_PHONE_PREFIX}001`,
      name: 'Test Farmer',
      role: 'farmer',
      village: 'Test Village',
      otp: null,
      otpExpiresAt: null,
    },
  });

  const worker = await prisma.user.create({
    data: {
      phone: `${TEST_PHONE_PREFIX}002`,
      name: 'Test Worker',
      role: 'worker',
      village: 'Test Village',
      otp: null,
      otpExpiresAt: null,
    },
  });

  const leader = await prisma.user.create({
    data: {
      phone: `${TEST_PHONE_PREFIX}003`,
      name: 'Test Leader',
      role: 'leader',
      village: 'Test Village',
      otp: null,
      otpExpiresAt: null,
    },
  });

  return {
    farmer,
    worker,
    leader,
    farmerToken: makeToken(farmer.id),
    workerToken: makeToken(worker.id),
    leaderToken: makeToken(leader.id),
  };
}

/**
 * Removes all test users (and all related records).
 */
async function cleanupTestUsers() {
  try {
    // Delete in strict reverse dependency order to avoid foreign key errors.
    // We filter by TEST_PHONE_PREFIX to ensure tests NEVER delete production data.
    
    // 1. Machinery Booking
    await prisma.machineryBooking.deleteMany({
      where: {
        OR: [
          { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { machinery: { owner: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 2. Machinery
    await prisma.machinery.deleteMany({
      where: { owner: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 3. Notification
    await prisma.notification.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 4. Rating
    await prisma.rating.deleteMany({
      where: {
        OR: [
          { fromUser: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { toUser: { phone: { startsWith: TEST_PHONE_PREFIX } } }
        ]
      }
    });

    // 5. Dispute
    await prisma.dispute.deleteMany({
      where: {
        OR: [
          { initiator: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { job: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 6. Settlement
    await prisma.settlement.deleteMany({
      where: {
        OR: [
          { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { payment: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } },
          { payment: { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 7. Payment
    await prisma.payment.deleteMany({
      where: {
        OR: [
          { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { job: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } },
          { booking: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 8. Attendance
    await prisma.attendance.deleteMany({
      where: {
        OR: [
          { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { job: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 9. JobApplication
    await prisma.jobApplication.deleteMany({
      where: {
        OR: [
          { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { job: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 10. Group Message
    await prisma.groupMessage.deleteMany({
      where: {
        OR: [
          { sender: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { group: { leader: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 11. Group Member
    await prisma.groupMember.deleteMany({
      where: {
        OR: [
          { worker: { phone: { startsWith: TEST_PHONE_PREFIX } } },
          { group: { leader: { phone: { startsWith: TEST_PHONE_PREFIX } } } }
        ]
      }
    });

    // 12. Group
    await prisma.group.deleteMany({
      where: { leader: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 13. Job
    await prisma.job.deleteMany({
      where: { farmer: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 14. Refresh Token
    await prisma.refreshToken.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 15. User Location
    await prisma.userLocation.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 16. User Animal
    await prisma.userAnimal.deleteMany({
      where: { user: { phone: { startsWith: TEST_PHONE_PREFIX } } }
    });

    // 17. User
    await prisma.user.deleteMany({
      where: { phone: { startsWith: TEST_PHONE_PREFIX } }
    });
  } catch (err) {
    console.warn('⚠️ Cleanup warning:', err.message);
  }
}

module.exports = { createTestUsers, cleanupTestUsers, makeToken };
