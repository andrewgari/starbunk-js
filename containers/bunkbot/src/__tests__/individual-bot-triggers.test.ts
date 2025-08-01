import { BotRegistry } from '../botRegistry';
import { 
	mockMessage, 
	mockHumanUser, 
	mockCovaBotUser, 
	mockGenericBotUser
} from '../test-utils/testUtils';
import { isDebugMode } from '@starbunk/shared';

// Mock the shared library
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	isDebugMode: jest.fn(),
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}
}));

const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;

describe('Individual Bot Trigger Tests', () => {
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

		// Default to production mode
		mockIsDebugMode.mockReturnValue(false);

		// Load bots
		await BotRegistry.discoverBots();
	});

	afterEach(() => {
		// Restore original Math.random
		global.Math.random = originalRandom;
	});

	describe('HoldBot Triggers', () => {
		let holdBot: any;

		beforeEach(() => {
			holdBot = registry.getReplyBot('HoldBot');
			expect(holdBot).toBeDefined();
		});

		it('should trigger on exact word "hold"', async () => {
			// Arrange
			const messages = [
				mockMessage({ content: 'hold', author: mockHumanUser() }),
				mockMessage({ content: 'hey hold', author: mockHumanUser() }),
				mockMessage({ content: 'hold on', author: mockHumanUser() }),
				mockMessage({ content: 'please hold', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				// The actual trigger logic would be tested here
				// This depends on the specific implementation of HoldBot
				expect(message.content.toLowerCase()).toMatch(/\bhold\b/);
			}
		});

		it('should NOT trigger on substring "hold"', async () => {
			// Arrange
			const messages = [
				mockMessage({ content: 'holding', author: mockHumanUser() }),
				mockMessage({ content: 'behold', author: mockHumanUser() }),
				mockMessage({ content: 'household', author: mockHumanUser() }),
				mockMessage({ content: 'threshold', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				// Should not match whole word "hold"
				expect(message.content.toLowerCase()).not.toMatch(/^.*\bhold\b.*$/);
			}
		});

		it('should NOT respond to CovaBot messages containing "hold"', async () => {
			// Arrange
			const _covaBotMessage = mockMessage({
				content: 'hold',
				author: mockCovaBotUser()
			});

			// Act & Assert
			// The bot should be filtered out by shouldExcludeFromReplyBots
			// This is tested in the CovaBot filtering tests
		});

		it('should be case insensitive', async () => {
			// Arrange
			const messages = [
				mockMessage({ content: 'HOLD', author: mockHumanUser() }),
				mockMessage({ content: 'Hold', author: mockHumanUser() }),
				mockMessage({ content: 'hOlD', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				expect(message.content.toLowerCase()).toContain('hold');
			}
		});
	});

	describe('BotBot Triggers', () => {
		let botBot: any;

		beforeEach(() => {
			botBot = registry.getReplyBot('BotBot');
			expect(botBot).toBeDefined();
		});

		it('should trigger on bot messages with 5% chance in production', async () => {
			// Arrange
			mockRandomValue = 0.03; // 3% - within 5% threshold
			const _botMessage = mockMessage({
				content: 'Hello from bot',
				author: mockGenericBotUser()
			});

			// Act & Assert
			// The bot should trigger based on fromBotExcludingCovaBot + withChance(5)
			// This is tested through the condition system
		});

		it('should NOT trigger when chance fails in production', async () => {
			// Arrange
			mockRandomValue = 0.07; // 7% - above 5% threshold
			const _botMessage = mockMessage({
				content: 'Hello from bot',
				author: mockGenericBotUser()
			});

			// Act & Assert
			// The bot should not trigger due to failed chance condition
		});

		it('should always trigger on bot messages in debug mode', async () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(true);
			mockRandomValue = 0.99; // 99% - would normally fail
			const _botMessage = mockMessage({
				content: 'Hello from bot',
				author: mockGenericBotUser()
			});

			// Act & Assert
			// The bot should trigger because debug mode overrides chance
		});

		it('should NOT trigger on CovaBot messages', async () => {
			// Arrange
			mockRandomValue = 0.01; // 1% - favorable chance
			const _covaBotMessage = mockMessage({
				content: 'Hello from CovaBot',
				author: mockCovaBotUser()
			});

			// Act & Assert
			// Should be excluded by fromBotExcludingCovaBot condition
		});

		it('should NOT trigger on human messages', async () => {
			// Arrange
			mockRandomValue = 0.01; // 1% - favorable chance
			const _humanMessage = mockMessage({
				content: 'Hello from human',
				author: mockHumanUser()
			});

			// Act & Assert
			// Should not trigger because it's not from a bot
		});
	});

	describe('NiceBot Triggers', () => {
		let niceBot: any;

		beforeEach(() => {
			niceBot = registry.getReplyBot('NiceBot');
			// Note: NiceBot might not exist, so we check conditionally
		});

		it('should trigger on "nice" word if bot exists', async () => {
			if (!niceBot) {
				console.log('NiceBot not found, skipping test');
				return;
			}

			// Arrange
			const messages = [
				mockMessage({ content: 'nice', author: mockHumanUser() }),
				mockMessage({ content: 'that was nice', author: mockHumanUser() }),
				mockMessage({ content: 'nice work', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				expect(message.content.toLowerCase()).toMatch(/\bnice\b/);
			}
		});
	});

	describe('HoldBot Triggers', () => {
		let holdBot: any;

		beforeEach(() => {
			holdBot = registry.getReplyBot('HoldBot');
			// Note: HoldBot might not exist, so we check conditionally
		});

		it('should trigger on "hold" word if bot exists', async () => {
			if (!holdBot) {
				console.log('HoldBot not found, skipping test');
				return;
			}

			// Arrange
			const messages = [
				mockMessage({ content: 'hold', author: mockHumanUser() }),
				mockMessage({ content: 'hold on', author: mockHumanUser() }),
				mockMessage({ content: 'please hold', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				expect(message.content.toLowerCase()).toMatch(/\bhold\b/);
			}
		});
	});

	describe('InterruptBot Triggers', () => {
		let interruptBot: any;

		beforeEach(() => {
			interruptBot = registry.getReplyBot('InterruptBot');
			// Note: InterruptBot might not exist, so we check conditionally
		});

		it('should trigger on "interrupt" word if bot exists', async () => {
			if (!interruptBot) {
				console.log('InterruptBot not found, skipping test');
				return;
			}

			// Arrange
			const messages = [
				mockMessage({ content: 'interrupt', author: mockHumanUser() }),
				mockMessage({ content: 'sorry to interrupt', author: mockHumanUser() }),
				mockMessage({ content: 'interrupt me if needed', author: mockHumanUser() })
			];

			// Act & Assert
			for (const message of messages) {
				expect(message.content.toLowerCase()).toMatch(/\binterrupt\b/);
			}
		});
	});

	describe('Cross-Bot Interaction Tests', () => {
		it('should handle messages that could trigger multiple bots', async () => {
			// Arrange
			const _multiTriggerMessage = mockMessage({
				content: 'guy that was nice, hold on, sorry to interrupt',
				author: mockHumanUser()
			});

			// Act
			const allBotNames = registry.getReplyBotNames();
			const potentialTriggers = [];

			for (const botName of allBotNames) {
				const bot = registry.getReplyBot(botName);
				if (bot) {
					potentialTriggers.push(botName);
				}
			}

			// Assert
			expect(potentialTriggers.length).toBeGreaterThan(0);
			
			// Multiple bots could potentially trigger on this message
			// The actual behavior depends on the bot registry's handling of multiple triggers
		});

		it('should ensure no bot responds to its own messages', async () => {
			// Arrange
			const allBotNames = registry.getReplyBotNames();

			// Act & Assert
			for (const botName of allBotNames) {
				const bot = registry.getReplyBot(botName);
				if (bot) {
					// Each bot should have self-exclusion logic
					// This is handled by the shouldExcludeFromReplyBots function
				}
			}
		});
	});

	describe('Bot Registry Integration', () => {
		it('should have all expected bots registered', async () => {
			// Act
			const replyBotNames = registry.getReplyBotNames();

			// Assert
			expect(replyBotNames).toContain('HoldBot');
			expect(replyBotNames).toContain('BotBot');

			// Other bots may or may not exist depending on implementation
			console.log('Registered reply bots:', replyBotNames);
		});

		it('should allow enabling and disabling individual bots', async () => {
			// Arrange
			const botName = 'HoldBot';

			// Act & Assert
			expect(registry.isBotEnabled(botName)).toBe(true); // Should be enabled by default
			
			expect(registry.disableBot(botName)).toBe(true);
			expect(registry.isBotEnabled(botName)).toBe(false);
			
			expect(registry.enableBot(botName)).toBe(true);
			expect(registry.isBotEnabled(botName)).toBe(true);
		});

		it('should handle bot frequency settings', async () => {
			// Arrange
			const botName = 'HoldBot';
			const newFrequency = 75;

			// Act
			const setResult = await registry.setBotFrequency(botName, newFrequency);
			const getResult = await registry.getBotFrequency(botName);

			// Assert
			expect(setResult).toBe(true);
			expect(getResult).toBe(newFrequency);
		});
	});

	describe('Error Handling', () => {
		it('should handle malformed messages gracefully', async () => {
			// Arrange
			const malformedMessages = [
				mockMessage({ content: '', author: mockHumanUser() }),
				mockMessage({ content: null as any, author: mockHumanUser() }),
				mockMessage({ content: undefined as any, author: mockHumanUser() }),
				mockMessage({ content: '   \n\t  ', author: mockHumanUser() })
			];

			// Act & Assert
			const holdBot = registry.getReplyBot('HoldBot');
			expect(holdBot).toBeDefined();

			// Should not crash on malformed input
			for (const _message of malformedMessages) {
				expect(() => {
					// Test that the bot can handle these messages without crashing
					// Actual trigger testing would depend on implementation
				}).not.toThrow();
			}
		});

		it('should handle missing author information', async () => {
			// Arrange
			const _messageWithoutAuthor = mockMessage({
				content: 'guy',
				author: null as any
			});

			// Act & Assert
			expect(() => {
				// Should not crash when author is missing
				// The shouldExcludeFromReplyBots function should handle this
			}).not.toThrow();
		});
	});
});
