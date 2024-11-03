// @ts-check

// Human Tasks:
// 1. Ensure @testing-library/jest-dom is installed: npm install --save-dev @testing-library/jest-dom@5.16.5
// 2. Create __mocks__ directory with necessary mock files for static assets
// 3. Configure IDE to recognize Jest global objects and methods
// 4. Set up pre-commit hooks to run tests before commits

/** @type {import('@jest/types').Config.InitialOptions} */

// Requirement: Testing Tools (7.5 Development and Deployment Tools)
// Configures Jest for comprehensive test coverage with 80% threshold
const config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',

  // Requirement: Web Dashboard Testing (4.4.1 Frontend Technologies)
  // Configure jsdom environment for React component testing
  testEnvironment: 'jsdom',

  // Define test file locations
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  // Configure module resolution to match tsconfig paths
  moduleNameMapper: {
    // Component imports
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    // Service imports
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    // Utility imports
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    // Custom hooks
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    // Redux store
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    // TypeScript types
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    // Configuration files
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    // Style files
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    // Handle style imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: [
    '@testing-library/jest-dom/extend-expect'
  ],

  // Test file patterns
  testRegex: [
    'tests/unit/.*(test|spec)\\.[jt]sx?$',
    'tests/integration/.*(test|spec)\\.[jt]sx?$',
    'tests/e2e/.*(test|spec)\\.[jt]sx?$'
  ],

  // File extensions to handle
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Transform ignore patterns for node_modules
  // Exception for Material-UI, Google Maps, and Socket.io packages
  transformIgnorePatterns: [
    '/node_modules/(?!@mui|@react-google-maps|socket.io-client)'
  ],

  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },

  // Automatically clear mock calls and instances between tests
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'clover'
  ],

  // The maximum amount of workers used to run tests
  maxWorkers: '50%',

  // Automatically restore mock state between every test
  restoreMocks: true,

  // The test environment that will be used for testing
  testEnvironmentOptions: {
    url: 'http://localhost'
  },

  // Timeout for each test in milliseconds
  testTimeout: 10000,

  // Verbose output
  verbose: true
};

module.exports = config;