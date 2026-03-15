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
    // Delete in strict reverse dependency order to avoid foreign key errors
    await prisma.rating.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.jobApplication.deleteMany({});
    await prisma.groupMessage.deleteMany({});
    await prisma.groupMember.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({
      where: { phone: { startsWith: TEST_PHONE_PREFIX } }
    });
  } catch (err) {
    console.warn('⚠️ Cleanup warning (likely empty DB or constraint):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { createTestUsers, cleanupTestUsers };
