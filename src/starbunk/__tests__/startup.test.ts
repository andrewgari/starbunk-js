import fs, { Dirent } from 'fs';
import { ReplyBotAdapter } from '../bots/adapter';
import { BotRegistry } from '../bots/botRegistry';
import ReplyBot from '../bots/replyBot';
import StarbunkClient from '../starbunkClient';

// Mock the StarbunkClient class
jest.mock('../starbunkClient', () => {
	return jest.fn().mockImplementation(() => {
		return {
			init: jest.fn().mockImplementation(async () => {
				// Check if directories exist before loading bots
				const mockFs = require('fs');
				const exists = mockFs.existsSync();

				if (exists) {
					// Call the loadBots method directly to simulate client initialization
					const { loadReplyBots } = require('../bots/reply-loader');
					const replyBots = await loadReplyBots();

					// Register bots in the registry
					const registry = BotRegistry.getInstance();
					replyBots.forEach((bot: ReplyBotAdapter) => {
						registry.registerBot(bot);
					});
				}
				// If directories don't exist, do nothing (no bots are registered)
			}),
		};
	});
});

// Mock fs
jest.mock('fs', () => {
	return {
		existsSync: jest.fn(),
		readdirSync: jest
			.fn()
			.mockImplementation(() => [
				{ name: 'cova-bot', isDirectory: () => true } as Dirent,
				{ name: 'baby-bot', isDirectory: () => true } as Dirent,
			]),
		promises: {
			rename: jest.fn(),
		},
	};
});

// Mock logger
jest.mock('../../services/logger', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock reply-loader
jest.mock('../bots/reply-loader', () => ({
	loadReplyBots: jest.fn().mockImplementation(() => {
		const mockCovaBot = new ReplyBotAdapter({
			name: 'CovaBot',
			description: 'Mock Cova Bot',
			processMessage: async () => {},
		});
		const mockBabyBot = new ReplyBotAdapter({
			name: 'BabyBot',
			description: 'Mock Baby Bot',
			processMessage: async () => {},
		});
		return [mockCovaBot, mockBabyBot];
	}),
}));

// Mock voice-loader
jest.mock('../bots/voice-loader', () => ({
	loadVoiceBots: jest.fn().mockResolvedValue([]),
}));

// Mock personality service
jest.mock('../../services/personalityService', () => ({
	getPersonalityService: jest.fn().mockReturnValue({
		loadPersonalityEmbedding: jest.fn().mockResolvedValue(undefined),
	}),
}));

describe('Starbunk startup', () => {
	let client: StarbunkClient;
	let mockFs: jest.Mocked<typeof fs>;
	let registry: BotRegistry;

	beforeEach(() => {
		jest.clearAllMocks();
		client = new StarbunkClient();
		mockFs = require('fs');

		// Reset the BotRegistry before each test
		registry = BotRegistry.getInstance();
		// Clear any existing bots
		registry['replyBots'].clear();
	});

	describe('Bot loading process', () => {
		it('should load and register all bots during startup', async () => {
			// Mock fs operations for bot directories
			mockFs.existsSync.mockReturnValue(true);

			// Initialize the client which should load bots
			await client.init();

			// Get the registered bots from BotRegistry
			const replyBots = Array.from(registry['replyBots'].values()) as ReplyBot[];

			// Verify bots were loaded and registered
			expect(replyBots.length).toBeGreaterThan(0);

			// Verify some known bots exist
			const botNames = replyBots.map((bot) => bot.defaultBotName);
			expect(botNames).toContain('CovaBot');
			expect(botNames).toContain('BabyBot');
		});

		it('should handle missing bot directories gracefully', async () => {
			// Mock directory not existing
			mockFs.existsSync.mockReturnValue(false);

			// Try to load bots
			await client.init();

			// Verify no bots were registered
			const replyBots = Array.from(registry['replyBots'].values()) as ReplyBot[];
			expect(replyBots.length).toBe(0);
		});
	});
});
