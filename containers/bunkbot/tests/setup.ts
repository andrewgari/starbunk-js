// Test setup for BunkBot container
process.env.STARBUNK_TOKEN = 'test_token';
process.env.NODE_ENV = 'test';
process.env.DEBUG = 'false';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock console methods to reduce test noise
global.console = {
	...console,
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
