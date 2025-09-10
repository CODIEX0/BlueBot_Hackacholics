/**
 * Jest Configuration for BlueBot Production Testing
 */

module.exports = {
  // Use a minimal preset for better compatibility
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup-simple.ts'],
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration - use ts-jest for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // TypeScript configuration for ts-jest and global flags
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        moduleResolution: 'node',
        types: ['jest', 'node']
      }
    },
    __DEV__: true,
  },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx)',
    '<rootDir>/tests/**/*.spec.(ts|tsx)',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.expo/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],
  
  // Coverage thresholds for production-ready code
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Specific thresholds for critical services
    'services/MultiAI.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    
  },
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Test timeout for integration tests
  testTimeout: 30000,
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Module name mapping for path resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
  // Map Expo native ESM modules to local Jest mocks to avoid ESM parse errors in Node env
  '^expo-secure-store$': '<rootDir>/tests/mocks/expo-secure-store.js',
  '^expo-local-authentication$': '<rootDir>/tests/mocks/expo-local-authentication.js',
  },
  
  
  // Test reporters for CI/CD integration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports',
        filename: 'test-report.html',
        expand: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
      },
    ],
  ],
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Note: collectCoverageFrom is defined once above
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Maximum concurrent workers for parallel testing
  maxWorkers: '50%',
  
  // Disable notifications to avoid dependency issues
  notify: false,
};
