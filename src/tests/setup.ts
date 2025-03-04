// This file is used by Jest to set up the test environment
import '@testing-library/jest-dom';
import { setupTestContainer } from '../starbunk/bots/__tests__/testUtils';

// Mock the global Date object if needed
const originalDate = global.Date;

// Set up the test environment before each test
beforeEach(() => {
	// Set up the service container with mock services for all tests
	setupTestContainer();
});

// Restore all mocks after each test
afterEach(() => {
	jest.restoreAllMocks();
	global.Date = originalDate;
});
