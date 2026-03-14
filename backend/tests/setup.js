// tests/setup.js

// Mock expo-server-sdk which causes ESM errors
jest.mock('expo-server-sdk', () => {
  return {
    Expo: class {
      static isExpoPushToken() { return true; }
      chunkPushNotifications(msgs) { return [msgs]; }
      async sendPushNotificationsAsync(chunk) { return chunk.map(() => ({ status: 'ok', id: 'test-id' })); }
    }
  };
});

// Mock winston to keep test output clean and avoid ESM issues
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('winston', () => ({
  createLogger: () => mockLogger,
  format: {
    combine: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    colorize: jest.fn().mockReturnThis(),
    simple: jest.fn().mockReturnThis(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Set env vars for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'file:./test.db';
process.env.PORT = '5001'; // Use a different port for tests
