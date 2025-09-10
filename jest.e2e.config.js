const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'E2E Tests',
  testMatch: [
    '<rootDir>/src/**/__tests__/e2e/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.e2e.test.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/__tests__/setup/e2e.setup.ts'
  ],
  testTimeout: 60000, // E2E tests need more time
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  // E2E test specific configuration
  maxWorkers: 1, // Run E2E tests serially
  testSequencer: '<rootDir>/src/__tests__/utils/testSequencer.js',
  // Simulate browser environment
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};