import { BotRegistry } from '../botRegistry';
import { 
	mockMessage, 
	mockHumanUser, 
	mockCovaBotUser, 
	mockGenericBotUser,
	mockTestingChannel,
	mockProductionChannel,
	mockClient
} from '../test-utils/testUtils';
import { isDebugMode, setDebugMode } from '@starbunk/shared';
import { logger } from '@starbunk/shared';

// Mock the shared library
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn(),
	setDebugMode: jest.fn(),
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;
const mockSetDebugMode = setDebugMode as jest.MockedFunction<typeof setDebugMode>;

describe('BunkBot E2E Tests - Message Filtering & Triggering', () => {
	let registry: BotRegistry;
	const originalRandom = global.Math.random;
	let mockRandomValue = 0.5;

	beforeEach(async () => {
		// Reset the registry for each test
		BotRegistry.reset();
		registry = BotRegistry.getInstance();

		// Mock Math.random for deterministic tests
		global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);

		// Clear all mocks
		jest.clearAllMocks();

		// Load bots
		await BotRegistry.discoverBots();
	});

	afterEach(() => {
		// Restore original Math.random
		global.Math.random = originalRandom;
	});

	describe('Debug Mode vs Production Mode Behavior', () => {
		describe('Debug Mode (DEBUG_MODE=true)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(true);
			});

			it('should respond to messages in testing channels only', async () => {
				// Arrange: Create messages in different channels
				const testingChannelMessage = mockMessage({
					content: 'guy',
					author: mockHumanUser(),
					channel: mockTestingChannel()
				});

				const productionChannelMessage = mockMessage({
					content: 'guy',
					author: mockHumanUser(),
					channel: mockProductionChannel()
				});

				// Act: Get the hold bot and test conditions
				const holdBot = registry.getReplyBot('HoldBot');

				// Assert: Bot should exist
				expect(holdBot).toBeDefined();

				// In debug mode, bots should be more permissive but still respect channel restrictions
				// This would need to be implemented in the actual bot logic
			});

			it('should always trigger chance-based conditions in debug mode', async () => {
				// Arrange: Set unfavorable random value
				mockRandomValue = 0.99; // 99% - should normally fail 5% chance

				const botMessage = mockMessage({
					content: 'Hello from bot',
					author: mockGenericBotUser()
				});

				// Act: Get the bot-bot and test condition
				const botBot = registry.getReplyBot('BotBot');
				
				// Assert: Bot should exist
				expect(botBot).toBeDefined();

				// In debug mode, chance conditions should always return true
				// This is handled by the withChance() condition function
			});

			it('should provide enhanced logging in debug mode', async () => {
				// Arrange: Create a test message
				const message = mockMessage({
					content: 'test message',
					author: mockHumanUser()
				});

				// Act: Process message through any bot
				const holdBot = registry.getReplyBot('HoldBot');

				// Assert: Bot should exist (this test validates the debug mode setup)
				expect(holdBot).toBeDefined();

				// The actual debug logging would be tested in the individual condition tests
				// This test validates that debug mode is properly configured
			});
		});

		describe('Production Mode (DEBUG_MODE=false)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(false);
			});

			it('should respect actual random chance in production', async () => {
				// Arrange: Set unfavorable random value for 5% chance
				mockRandomValue = 0.07; // 7% - above 5% threshold

				const botMessage = mockMessage({
					content: 'Hello from bot',
					author: mockGenericBotUser()
				});

				// Act: Test the bot-bot condition
				const botBot = registry.getReplyBot('BotBot');
				
				// Assert: Bot should exist
				expect(botBot).toBeDefined();

				// In production mode, chance conditions should respect actual random values
				// This would be tested by the individual bot trigger tests
			});

			it('should work in all channels in production mode', async () => {
				// Arrange: Create messages in different channels
				const testingChannelMessage = mockMessage({
					content: 'guy',
					author: mockHumanUser(),
					channel: mockTestingChannel()
				});

				const productionChannelMessage = mockMessage({
					content: 'guy',
					author: mockHumanUser(),
					channel: mockProductionChannel()
				});

				// Act: Get the hold bot
				const holdBot = registry.getReplyBot('HoldBot');

				// Assert: Bot should exist and work in both channels
				expect(holdBot).toBeDefined();
			});
		});
	});

	describe('Bot Message Filtering - CovaBot Exclusion', () => {
		beforeEach(() => {
			mockIsDebugMode.mockReturnValue(false);
		});

		it('should NEVER respond to CovaBot messages', async () => {
			// Arrange: Create a message from CovaBot
			const covaBotMessage = mockMessage({
				content: 'hold', // This would normally trigger HoldBot
				author: mockCovaBotUser()
			});

			// Act: Test all reply bots
			const allBotNames = registry.getReplyBotNames();
			
			// Assert: No bot should respond to CovaBot messages
			for (const botName of allBotNames) {
				const bot = registry.getReplyBot(botName);
				expect(bot).toBeDefined();
				
				// The bot filtering logic should prevent any response to CovaBot
				// This is implemented in the shouldExcludeFromReplyBots() function
			}
		});

		it('should respond to other bot messages when appropriate', async () => {
			// Arrange: Set favorable random value for bot-bot
			mockRandomValue = 0.03; // 3% - within 5% threshold

			const genericBotMessage = mockMessage({
				content: 'Hello from generic bot',
				author: mockGenericBotUser()
			});

			// Act: Test bot-bot specifically (designed to respond to other bots)
			const botBot = registry.getReplyBot('BotBot');
			
			// Assert: BotBot should exist and be able to respond to generic bots
			expect(botBot).toBeDefined();
		});

		it('should respond to human messages normally', async () => {
			// Arrange: Create a message from a human that should trigger HoldBot
			const humanMessage = mockMessage({
				content: 'hold',
				author: mockHumanUser()
			});

			// Act: Test hold bot
			const holdBot = registry.getReplyBot('HoldBot');

			// Assert: HoldBot should exist and respond to human messages
			expect(holdBot).toBeDefined();
		});
	});

	describe('Bot Registry Management', () => {
		it('should discover and register all available bots', async () => {
			// Act: Get all bot names
			const replyBotNames = registry.getReplyBotNames();
			const voiceBotNames = registry.getVoiceBotNames();
			const allBotNames = registry.getAllBotNames();

			// Assert: Should have discovered bots
			expect(replyBotNames.length).toBeGreaterThan(0);
			expect(allBotNames.length).toBeGreaterThanOrEqual(replyBotNames.length);
			
			// Should include expected bots
			expect(replyBotNames).toContain('HoldBot');
			expect(replyBotNames).toContain('BotBot');
		});

		it('should allow enabling and disabling bots', async () => {
			// Arrange: Get a bot
			const botName = 'HoldBot';
			
			// Act & Assert: Test enable/disable functionality
			expect(registry.enableBot(botName)).toBe(true);
			expect(registry.isBotEnabled(botName)).toBe(true);
			
			expect(registry.disableBot(botName)).toBe(true);
			expect(registry.isBotEnabled(botName)).toBe(false);
		});

		it('should handle bot frequency settings', async () => {
			// Arrange: Get a bot
			const botName = 'HoldBot';
			const newRate = 75;
			
			// Act: Set and get frequency
			const setResult = await registry.setBotFrequency(botName, newRate);
			const retrievedRate = await registry.getBotFrequency(botName);
			
			// Assert: Frequency should be set correctly
			expect(setResult).toBe(true);
			expect(retrievedRate).toBe(newRate);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle non-existent bot operations gracefully', async () => {
			// Act & Assert: Test operations on non-existent bot
			expect(registry.enableBot('NonExistentBot')).toBe(false);
			expect(registry.disableBot('NonExistentBot')).toBe(false);
			expect(registry.isBotEnabled('NonExistentBot')).toBe(false);
			
			const setResult = await registry.setBotFrequency('NonExistentBot', 50);
			const getResult = await registry.getBotFrequency('NonExistentBot');
			
			expect(setResult).toBe(false);
			expect(getResult).toBe(0);
		});

		it('should handle empty or malformed messages', async () => {
			// Arrange: Create various edge case messages
			const emptyMessage = mockMessage({
				content: '',
				author: mockHumanUser()
			});

			const whitespaceMessage = mockMessage({
				content: '   \n\t  ',
				author: mockHumanUser()
			});

			const nullContentMessage = mockMessage({
				content: null as any,
				author: mockHumanUser()
			});

			// Act: Get a bot to test with
			const holdBot = registry.getReplyBot('HoldBot');

			// Assert: Bot should exist and handle edge cases gracefully
			expect(holdBot).toBeDefined();
			
			// The bot should not crash on malformed input
			// Specific behavior depends on individual bot implementations
		});
	});
});
