// This file is used by Jest to set up the test environment
import '@testing-library/jest-dom';

// Mock the global Date object if needed
const originalDate = global.Date;

// Restore all mocks after each test
afterEach(() => {
	jest.restoreAllMocks();
	global.Date = originalDate;
});
