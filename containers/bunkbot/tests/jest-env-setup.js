// Jest environment setup - runs before all tests
// This file forces specific environment variables to override CI/CD settings

// Force DEBUG_MODE to false for all tests to ensure consistent behavior
process.env.DEBUG_MODE = 'false';
process.env.NODE_ENV = 'test';

// Ensure other test environment variables are set
process.env.STARBUNK_TOKEN = 'test_token';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
