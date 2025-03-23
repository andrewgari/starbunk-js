// This file is used by Jest to set up the test environment
import '@testing-library/jest-dom';
import { setupBotMocks, setupTestContainer } from '../starbunk/bots/__tests__/testUtils';

// Mock the global Date object if needed
const originalDate = global.Date;

// Set up the test environment before each test
beforeEach(() => {
	// Set up the service container with mock services for all tests
	setupTestContainer();
	// Set up mocks for bot tests
	setupBotMocks();
});

// Restore all mocks after each test
afterEach(() => {
	jest.restoreAllMocks();
	global.Date = originalDate;
});

// Global test setup file for Jest

// Silence all console output during tests
const originalConsole = {
	log: console.log,
	warn: console.warn,
	error: console.error,
	info: console.info
};

// Replace console methods with no-op functions
beforeAll(() => {
	console.log = jest.fn();
	console.warn = jest.fn();
	console.error = jest.fn();
	console.info = jest.fn();
});

// Restore console methods after tests
afterAll(() => {
	console.log = originalConsole.log;
	console.warn = originalConsole.warn;
	console.error = originalConsole.error;
	console.info = originalConsole.info;
});

// Create global mock for Logger
const mockLoggerInstance = {
	info: jest.fn(),
	debug: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
};

jest.mock('../services/logger', () => {
	return {
		Logger: {
			getInstance: jest.fn().mockReturnValue(mockLoggerInstance)
		},
		logger: mockLoggerInstance
	};
});

// Mock environment helpers globally
jest.mock('../environment', () => ({
	isTest: jest.fn().mockReturnValue(true),
	isDebugMode: jest.fn().mockReturnValue(false),
	isTestingMode: jest.fn().mockReturnValue(true),
	getDebugModeSetting: jest.fn().mockReturnValue('test'),
	environment: {
		app: {
			NODE_ENV: 'test'
		}
	}
}));
