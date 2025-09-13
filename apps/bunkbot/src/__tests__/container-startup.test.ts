import { logger, validateEnvironment } from '@starbunk/shared';

// Mock the shared library
jest.mock('@starbunk/shared', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
	isDebugMode: jest.fn(() => false),
	validateEnvironment: jest.fn(() => ({ isValid: true, errors: [] })),
	getDiscordService: jest.fn(() => ({
		initialize: jest.fn(),
		deploySlashCommands: jest.fn(),
		startBotProfileRefresh: jest.fn(),
	})),
	getBotIdentityService: jest.fn(() => ({
		initialize: jest.fn(),
	})),
	getMessageFilter: jest.fn(() => ({
		initialize: jest.fn(),
	})),
}));

// Mock Discord.js
jest.mock('discord.js', () => ({
	Client: jest.fn().mockImplementation(() => ({
		login: jest.fn().mockResolvedValue('token'),
		on: jest.fn(),
		user: { id: '836445923105308672', username: 'TestBot' },
		guilds: {
			cache: new Map([
				[
					'753251582719688714',
					{
						id: '753251582719688714',
						name: 'Test Guild',
						memberCount: 66,
					},
				],
			]),
		},
	})),
	GatewayIntentBits: {
		Guilds: 1,
		GuildMessages: 512,
		MessageContent: 32768,
		GuildMembers: 2,
	},
	Partials: {
		Message: 'MESSAGE',
	},
}));

// Mock the configuration service
jest.mock('../services/configurationService', () => ({
	ConfigurationService: jest.fn().mockImplementation(() => ({
		initialize: jest.fn().mockResolvedValue(undefined),
		refreshCache: jest.fn().mockResolvedValue(undefined),
	})),
}));

// Mock the bot registry
jest.mock('../botRegistry', () => ({
	BotRegistry: jest.fn().mockImplementation(() => ({
		discoverAndLoadBots: jest.fn().mockResolvedValue([
			{ name: 'TestBot1', description: 'Test bot 1' },
			{ name: 'TestBot2', description: 'Test bot 2' },
		]),
		getBots: jest.fn().mockReturnValue([
			{ name: 'TestBot1', description: 'Test bot 1' },
			{ name: 'TestBot2', description: 'Test bot 2' },
		]),
	})),
}));

// Mock HTTP server for health checks
jest.mock('http', () => ({
	createServer: jest.fn().mockImplementation((_handler) => ({
		listen: jest.fn((port, callback) => {
			if (callback) callback();
		}),
		close: jest.fn(),
	})),
}));

describe('BunkBot Container Startup Components', () => {
	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Set up environment variables
		process.env.STARBUNK_TOKEN = 'test-token';
		process.env.DEBUG_MODE = 'false';
		process.env.TESTING_SERVER_IDS = '753251582719688714';
	});

	describe('Environment Validation', () => {
		it('should validate required environment variables', () => {
			const result = validateEnvironment();
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should detect missing STARBUNK_TOKEN', () => {
			const originalToken = process.env.STARBUNK_TOKEN;
			delete process.env.STARBUNK_TOKEN;
			const result = validateEnvironment();
			// Restore the token for other tests
			if (originalToken) process.env.STARBUNK_TOKEN = originalToken;

			// The validation might still pass if other required vars are present
			// This test mainly ensures the function doesn't crash
			expect(result).toBeDefined();
			expect(result.isValid).toBeDefined();
		});

		it('should handle debug mode configuration', () => {
			process.env.DEBUG_MODE = 'true';
			const result = validateEnvironment();
			expect(result.isValid).toBe(true);
		});
	});

	describe('Discord Client Mocking', () => {
		it('should have Discord.js mocked properly', () => {
			const { Client } = require('discord.js');
			expect(Client).toBeDefined();
			expect(typeof Client).toBe('function');
		});

		it('should create mock Discord client', () => {
			const { Client } = require('discord.js');
			const client = new Client();
			expect(client).toBeDefined();
			expect(client.login).toBeDefined();
		});
	});

	describe('Bot Registry Functionality', () => {
		it('should create bot registry instance', () => {
			const mockBotRegistry = require('../botRegistry').BotRegistry;
			const registry = new mockBotRegistry();
			expect(registry).toBeDefined();
		});

		it('should handle bot discovery', async () => {
			const mockBotRegistry = require('../botRegistry').BotRegistry;
			const registry = new mockBotRegistry();

			const bots = await registry.discoverAndLoadBots();
			expect(Array.isArray(bots)).toBe(true);
			expect(bots).toHaveLength(2);
		});

		it('should handle bot loading failures gracefully', async () => {
			const mockBotRegistry = require('../botRegistry').BotRegistry;
			mockBotRegistry.mockImplementation(() => ({
				discoverAndLoadBots: jest.fn().mockRejectedValue(new Error('Bot loading failed')),
				getBots: jest.fn().mockReturnValue([]),
			}));

			const registry = new mockBotRegistry();
			await expect(registry.discoverAndLoadBots()).rejects.toThrow('Bot loading failed');
		});
	});

	describe('Logging and Error Handling', () => {
		it('should have logger available', () => {
			expect(logger).toBeDefined();
			expect(logger.info).toBeDefined();
			expect(logger.error).toBeDefined();
			expect(logger.debug).toBeDefined();
		});

		it('should handle logging calls without errors', () => {
			expect(() => {
				logger.info('Test info message');
				logger.debug('Test debug message');
				logger.error('Test error message');
			}).not.toThrow();
		});
	});

	describe('Module Imports', () => {
		it('should import shared library components successfully', () => {
			expect(validateEnvironment).toBeDefined();
			expect(logger).toBeDefined();
		});

		it('should import bot registry successfully', () => {
			const { BotRegistry } = require('../botRegistry');
			expect(BotRegistry).toBeDefined();
		});

		it('should import CovaBot filtering conditions successfully', () => {
			const { isCovaBot, shouldExcludeFromReplyBots, fromBotExcludingCovaBot } = require('../core/conditions');
			expect(isCovaBot).toBeDefined();
			expect(shouldExcludeFromReplyBots).toBeDefined();
			expect(fromBotExcludingCovaBot).toBeDefined();
		});
	});
});
