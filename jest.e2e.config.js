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
  testTimeout: 60000, // E2E测试需要更长时间
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
  // E2E测试特定配置
  maxWorkers: 1, // 串行运行E2E测试
  testSequencer: '<rootDir>/src/__tests__/utils/testSequencer.js',
  // 模拟浏览器环境
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};