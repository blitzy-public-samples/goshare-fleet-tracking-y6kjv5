// @ts-check

// Requirement: Jest configuration for React Native Android application with offline-first architecture
// Version requirements:
// - @testing-library/react-native: ^11.5.0
// - @jest/globals: ^29.5.0
// - ts-jest: ^29.1.0

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // Requirement: Testing configuration to validate offline operation support
  preset: 'react-native',

  // File extensions to consider for tests
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Setup files to run before each test
  setupFiles: ['./jest.setup.js'],

  // Transform configuration for TypeScript files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true,
        babelConfig: true,
      },
    ],
  },

  // Ignore node_modules except for specific React Native packages
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation))',
  ],

  // Path mapping configuration from tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // Files to ignore during testing
  testPathIgnorePatterns: [
    '\\.snap$',
    '<rootDir>/node_modules/',
  ],

  // Cache directory for faster subsequent runs
  cacheDirectory: '.jest/cache',

  // Code coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/**/index.ts',
  ],

  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage report formats
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Test environment configuration
  testEnvironment: 'node',
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      diagnostics: {
        warnOnly: true,
      },
    },
  },

  // Verbose output for detailed test results
  verbose: true,

  // Clear mock calls and instances between tests
  clearMocks: true,

  // Reset mocks before each test
  resetMocks: true,

  // Automatically restore mocks between tests
  restoreMocks: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Fail tests on console errors
  errorOnDeprecated: true,

  // Detect memory leaks in tests
  detectLeaks: true,

  // Force exit after test completion
  forceExit: true,

  // Test timeout in milliseconds
  testTimeout: 10000,
};

module.exports = config;