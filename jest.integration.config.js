const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/**/__tests__/integration/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/*.integration.test.{ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/setupTests.ts',
    '<rootDir>/src/__tests__/setup/integration.setup.ts'
  ],
  testTimeout: 30000, // Integration tests may need more time
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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Integration test specific configuration
  maxWorkers: 1, // Run integration tests serially to avoid conflicts
  testSequencer: '<rootDir>/src/__tests__/utils/testSequencer.js'
};