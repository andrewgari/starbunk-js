/**
 * Tests for the Centralized Message Filter Service
 */

import { CentralizedMessageFilter, MessageFilterConfig } from '../centralizedMessageFilter';
import { Message } from 'discord.js';

// Mock message helper
function createMockMessage(overrides: Partial<Message> = {}): Message {
	return {
		author: {
			id: '123456789012345678',
			username: 'TestUser',
			bot: false,
			...overrides.author
		},
		content: 'Hello world',
		...overrides
	} as Message;
}

describe('CentralizedMessageFilter', () => {
	let filter: CentralizedMessageFilter;
	let defaultConfig: MessageFilterConfig;

	beforeEach(() => {
		defaultConfig = {
			currentBotUserId: '999999999999999999',
			whitelistedBotIds: ['111111111111111111', '222222222222222222'],
			inverseBehaviorBots: ['BotBot'],
			debugMode: false
		};
		filter = new CentralizedMessageFilter(defaultConfig);
	});

	describe('Regular user messages', () => {
		it('should allow regular user messages', () => {
			const message = createMockMessage({
				author: { id: '123456789012345678', username: 'RegularUser', bot: false }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(true);
			expect(result.reason).toBe('Regular user message');
			expect(result.wasBotMessage).toBe(false);
		});
	});

	describe('Self-trigger prevention', () => {
		it('should block messages from the current bot', () => {
			const message = createMockMessage({
				author: { id: '999999999999999999', username: 'CurrentBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Self-trigger prevention: Message from current bot');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should work even when currentBotUserId is undefined', () => {
			filter.updateConfig({ currentBotUserId: undefined });
			const message = createMockMessage({
				author: { id: '999999999999999999', username: 'SomeBot', bot: true }
			});

			// Should not trigger self-prevention when currentBotUserId is undefined
			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Default bot filtering: ignoring message from bot SomeBot');
			expect(result.wasBotMessage).toBe(true);
		});
	});

	describe('Bot message filtering', () => {
		it('should block regular bot messages by default', () => {
			const message = createMockMessage({
				author: { id: '333333333333333333', username: 'RandomBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Default bot filtering: ignoring message from bot RandomBot');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should allow whitelisted bot messages', () => {
			const message = createMockMessage({
				author: { id: '111111111111111111', username: 'WhitelistedBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(true);
			expect(result.reason).toBe('Bot WhitelistedBot (111111111111111111) is whitelisted');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should handle multiple whitelisted bots', () => {
			const message1 = createMockMessage({
				author: { id: '111111111111111111', username: 'WhitelistedBot1', bot: true }
			});
			const message2 = createMockMessage({
				author: { id: '222222222222222222', username: 'WhitelistedBot2', bot: true }
			});

			const result1 = filter.shouldProcessMessage(message1);
			const result2 = filter.shouldProcessMessage(message2);

			expect(result1.shouldProcess).toBe(true);
			expect(result2.shouldProcess).toBe(true);
		});
	});

	describe('Inverse behavior bots (BotBot)', () => {
		it('should block user messages for inverse behavior bots', () => {
			const message = createMockMessage({
				author: { id: '123456789012345678', username: 'RegularUser', bot: false }
			});

			const result = filter.shouldProcessMessage(message, 'BotBot');

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe("Inverse behavior bot 'BotBot' ignores user messages");
			expect(result.wasBotMessage).toBe(false);
		});

		it('should allow bot messages for inverse behavior bots', () => {
			const message = createMockMessage({
				author: { id: '333333333333333333', username: 'OtherBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message, 'BotBot');

			expect(result.shouldProcess).toBe(true);
			expect(result.reason).toBe('Inverse behavior bot processing bot message from OtherBot');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should still respect self-trigger prevention for inverse behavior bots', () => {
			const message = createMockMessage({
				author: { id: '999999999999999999', username: 'CurrentBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message, 'BotBot');

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Self-trigger prevention: Message from current bot');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should exclude problematic bots even for inverse behavior bots', () => {
			const message = createMockMessage({
				author: { id: '444444444444444444', username: 'covabot', bot: true }
			});

			const result = filter.shouldProcessMessage(message, 'BotBot');

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Bot covabot is excluded from processing');
			expect(result.wasBotMessage).toBe(true);
		});

		it('should handle different CovaBot name variations', () => {
			const variations = [
				{ username: 'CovaBot', displayName: 'CovaBot' },
				{ username: 'COVABOT', displayName: 'COVABOT' },
				{ username: 'cova-bot', displayName: 'cova-bot' },
				{ username: 'cova_bot', displayName: 'cova_bot' },
				{ username: 'TestBot', displayName: 'CovaBot' } // DisplayName contains pattern
			];

			variations.forEach((authorData, index) => {
				const message = createMockMessage({
					author: { 
						id: `44444444444444444${index}`, 
						username: authorData.username, 
						displayName: authorData.displayName,
						bot: true 
					}
				});

				const result = filter.shouldProcessMessage(message, 'BotBot');

				expect(result.shouldProcess).toBe(false);
				expect(result.reason).toBe(`Bot ${authorData.username} is excluded from processing`);
			});
		});
	});

	describe('Configuration management', () => {
		it('should update configuration correctly', () => {
			const newConfig = {
				whitelistedBotIds: ['555555555555555555'],
				inverseBehaviorBots: ['CustomBot'],
				debugMode: true
			};

			filter.updateConfig(newConfig);
			const updatedConfig = filter.getConfig();

			expect(updatedConfig.whitelistedBotIds).toEqual(['555555555555555555']);
			expect(updatedConfig.inverseBehaviorBots).toEqual(['CustomBot']);
			expect(updatedConfig.debugMode).toBe(true);
			expect(updatedConfig.currentBotUserId).toBe('999999999999999999'); // Should preserve existing
		});

		it('should partially update configuration', () => {
			filter.updateConfig({ debugMode: true });
			const config = filter.getConfig();

			expect(config.debugMode).toBe(true);
			expect(config.whitelistedBotIds).toEqual(defaultConfig.whitelistedBotIds); // Should preserve
		});
	});

	describe('Edge cases', () => {
		it('should handle messages with no content', () => {
			const message = createMockMessage({
				content: '',
				author: { id: '123456789012345678', username: 'TestUser', bot: false }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(true);
			expect(result.reason).toBe('Regular user message');
		});

		it('should handle undefined author properties gracefully', () => {
			const message = createMockMessage({
				author: { id: '123456789012345678', username: undefined, bot: false }
			});

			const result = filter.shouldProcessMessage(message);

			expect(result.shouldProcess).toBe(true);
			expect(result.reason).toBe('Regular user message');
		});

		it('should handle unknown requesting bot names', () => {
			const message = createMockMessage({
				author: { id: '333333333333333333', username: 'SomeBot', bot: true }
			});

			const result = filter.shouldProcessMessage(message, 'UnknownBot');

			expect(result.shouldProcess).toBe(false);
			expect(result.reason).toBe('Default bot filtering: ignoring message from bot SomeBot');
		});
	});

	describe('Debug mode logging', () => {
		beforeEach(() => {
			filter.updateConfig({ debugMode: true });
			// Mock logger to capture calls
			jest.spyOn(console, 'log').mockImplementation(() => {});
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should log filtering decisions in debug mode', () => {
			const message = createMockMessage({
				author: { id: '123456789012345678', username: 'TestUser', bot: false }
			});

			filter.shouldProcessMessage(message);

			// Verify that logging occurred
			expect(console.log).toHaveBeenCalled();
			// Or more specifically:
			// expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[GLOBAL] ✅ ALLOWED'));
		});
	});
});

describe('Environment variable parsing', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should parse whitelist IDs from environment', async () => {
		process.env.BOT_WHITELIST_IDS = '111111111111111111,222222222222222222,333333333333333333';
		process.env.DEBUG_MODE = 'true';

		// Re-import to get fresh instance with new env vars
		const { createMessageFilterFromEnv } = await import('../centralizedMessageFilter');
		const filter = createMessageFilterFromEnv();

		const config = filter.getConfig();
		expect(config.whitelistedBotIds).toEqual([
			'111111111111111111',
			'222222222222222222', 
			'333333333333333333'
		]);
	});

	it('should handle empty whitelist environment variable', async () => {
		process.env.BOT_WHITELIST_IDS = '';
		
		const { createMessageFilterFromEnv } = await import('../centralizedMessageFilter');
		const filter = createMessageFilterFromEnv();

		const config = filter.getConfig();
		expect(config.whitelistedBotIds).toEqual([]);
	});

	it('should use default inverse behavior bots when not specified', async () => {
		delete process.env.INVERSE_BEHAVIOR_BOTS;
		
		const { createMessageFilterFromEnv } = await import('../centralizedMessageFilter');
		const filter = createMessageFilterFromEnv();

		const config = filter.getConfig();
		expect(config.inverseBehaviorBots).toEqual(['BotBot']);
	});

	it('should parse custom inverse behavior bots', async () => {
		process.env.INVERSE_BEHAVIOR_BOTS = 'BotBot,CustomBot,AnotherBot';
		
		const { createMessageFilterFromEnv } = await import('../centralizedMessageFilter');
		const filter = createMessageFilterFromEnv();

		const config = filter.getConfig();
		expect(config.inverseBehaviorBots).toEqual(['BotBot', 'CustomBot', 'AnotherBot']);
	});
});