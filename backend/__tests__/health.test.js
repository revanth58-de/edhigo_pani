const request = require('supertest');

// Mocks
jest.mock('../src/config/database', () => ({
  user: { findUnique: jest.fn() },
  job: { findUnique: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
}));

jest.mock('../src/config/socket', () => ({
  setIO: jest.fn(),
  getIO: jest.fn(),
}));

jest.mock('../src/services/pushNotification', () => ({
  sendPush: jest.fn(),
  notifyWorkersNewJob: jest.fn(),
  notifyFarmerJobAccepted: jest.fn(),
  notifyWorkerJobRejected: jest.fn(),
  notifyFarmerJobWithdrawn: jest.fn(),
  notifyWorkerJobCancelled: jest.fn(),
  notifyFarmerAttendanceIn: jest.fn(),
  notifyFarmerAttendanceOut: jest.fn(),
  notifyFarmerWorkerArrived: jest.fn(),
}));

// Import app directly
const { app } = require('../src/server');

describe('API Connectivity', () => {
  it('should have a defined Express app', () => {
    expect(app).toBeDefined();
  });

  it('should return 200 for /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
