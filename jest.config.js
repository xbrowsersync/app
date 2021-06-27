module.exports = {
  collectCoverageFrom: ['<rootDir>/src/modules/**/*.ts'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/modules/**/*.spec.ts']
};
