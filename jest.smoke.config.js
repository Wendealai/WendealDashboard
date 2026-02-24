import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  displayName: 'Smoke Tests',
  testMatch: ['<rootDir>/src/__tests__/smoke/**/*.test.{ts,tsx}'],
  maxWorkers: 1,
  testTimeout: 20000,
  collectCoverage: false,
  coverageThreshold: undefined,
};
