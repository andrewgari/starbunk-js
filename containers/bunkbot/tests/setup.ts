// Test setup for BunkBot container
process.env.STARBUNK_TOKEN = 'test_token';
process.env.NODE_ENV = 'test';
process.env.DEBUG_MODE = 'false';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
	PrismaClient: jest.fn().mockImplementation(() => ({
		userConfiguration: {
			findMany: jest.fn().mockResolvedValue([]),
			findUnique: jest.fn().mockResolvedValue(null),
		},
		botConfiguration: {
			findMany: jest.fn().mockResolvedValue([]),
			findUnique: jest.fn().mockResolvedValue(null),
		},
		serverConfiguration: {
			findMany: jest.fn().mockResolvedValue([]),
			findUnique: jest.fn().mockResolvedValue(null),
		},
		blacklist: {
			findUnique: jest.fn().mockResolvedValue(null),
		},
		$disconnect: jest.fn().mockResolvedValue(undefined),
	})),
}));

// Mock ConfigurationService
jest.mock('../src/services/configurationService', () => ({
	ConfigurationService: jest.fn().mockImplementation(() => ({
		getUserIdByUsername: jest.fn().mockImplementation((username: string) => {
			// Return mock user IDs for common test users
			const userMap: Record<string, string> = {
				'Chad': '85184539906809856',
				'Venn': '151120340343455744',
				'Guy': '135820819086573568',
				'Cova': '636919993cbe3dde78b509e6',
			};
			return Promise.resolve(userMap[username] || null);
		}),
		getUserConfig: jest.fn().mockResolvedValue(null),
	})),
}));

// Mock console methods to reduce test noise
global.console = {
	...console,
	log: jest.fn(),
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};
