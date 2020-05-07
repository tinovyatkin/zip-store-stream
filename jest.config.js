module.exports = {
  clearMocks: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'json'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  moduleFileExtensions: ['ts', 'js'],
  coverageProvider: 'v8',
  testRunner: 'jest-circus/runner',
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.sonarlint/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/.vscode/',
  ],
};
