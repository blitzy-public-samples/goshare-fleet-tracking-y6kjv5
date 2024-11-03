// @ts-check

// Requirement: Testing Infrastructure (4.7 Deployment Architecture/CI/CD Pipeline)
// Configure automated testing for backend services in CI/CD pipeline

// Requirement: Core Backend Services (1.1 System Overview/Core Backend Services)
// Enable testing for Node.js and Python microservices

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  // Use ts-jest for TypeScript preprocessing
  // ts-jest version: ^29.1.0
  preset: 'ts-jest',

  // Set Node.js as test environment
  testEnvironment: 'node',

  // Define test file locations
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|js)',
    '**/?(*.)+(spec|test).+(ts|js)'
  ],

  // Transform TypeScript files using ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Path aliases matching tsconfig.json configuration
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
    '@common/(.*)': '<rootDir>/src/common/$1',
    '@services/(.*)': '<rootDir>/src/services/$1',
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
    '@middleware/(.*)': '<rootDir>/src/middleware/$1'
  },

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/index.{js,ts}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],

  // TypeScript configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },

  // Enable verbose output for detailed test results
  verbose: true,

  // Test timeout in milliseconds
  testTimeout: 30000,

  // Additional Jest configurations for comprehensive testing
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,

  // Reporter configuration for CI/CD integration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Custom environment variables for testing
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

module.exports = config;