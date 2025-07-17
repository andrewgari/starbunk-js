// Test setup for CovaBot tests
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.STARBUNK_TOKEN = 'test-token';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.QDRANT_URL = 'http://localhost:6333';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DEBUG_MODE = 'false';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock timers
jest.useFakeTimers();

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Clean up after all tests
afterAll(() => {
  jest.useRealTimers();
});
