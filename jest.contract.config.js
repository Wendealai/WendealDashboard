import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  displayName: 'Contract Tests',
  testMatch: ['<rootDir>/src/__tests__/contract/**/*.test.{ts,tsx}'],
  maxWorkers: 1,
  testTimeout: 25000,
  collectCoverage: false,
  coverageThreshold: undefined,
};
