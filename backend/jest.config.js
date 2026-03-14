module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@prisma/client/runtime/library.mjs$': '<rootDir>/node_modules/@prisma/client/runtime/library.js',
    '^@prisma/client/runtime/binary.mjs$': '<rootDir>/node_modules/@prisma/client/runtime/binary.js',
    '^@prisma/client/runtime/client.mjs$': '<rootDir>/node_modules/@prisma/client/runtime/client.js',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
};
