module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/blockedads-simple-tests.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/setup.js',
    '/tests/blockedads-chrome-tests.js'
  ],
  collectCoverageFrom: [
    'tests/blockedads-core-test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 10000
};
