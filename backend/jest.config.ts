import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  forceExit: true,
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
};

export default config;
