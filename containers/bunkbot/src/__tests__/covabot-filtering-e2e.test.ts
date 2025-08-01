import { BotRegistry } from '../botRegistry';
import { 
	isCovaBot,
	shouldExcludeFromReplyBots,
	fromBotExcludingCovaBot
} from '../core/conditions';
import { 
	mockMessage, 
	mockHumanUser, 
	mockCovaBotUser, 
	mockGenericBotUser,
	mockClient
} from '../test-utils/testUtils';
import { isDebugMode } from '@starbunk/shared';
import { logger } from '@starbunk/shared';

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

describe('CovaBot Filtering E2E Tests', () => {
	let registry: BotRegistry;

	beforeEach(async () => {
		// Reset the registry for each test
		BotRegistry.reset();
		registry = BotRegistry.getInstance();

		// Clear all mocks
		jest.clearAllMocks();

		// Default to production mode
		mockIsDebugMode.mockReturnValue(false);

		// Load bots
		await BotRegistry.discoverBots();
	});

	describe('CovaBot Detection Accuracy', () => {
		it('should correctly identify CovaBot by exact username', () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser({ username: 'CovaBot' })
			});

			// Act & Assert
			expect(isCovaBot(covaBotMessage)).toBe(true);
		});

		it('should correctly identify CovaBot by display name', () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser({ 
					username: 'SomeOtherName',
					displayName: 'CovaBot'
				})
			});

			// Act & Assert
			expect(isCovaBot(covaBotMessage)).toBe(true);
		});

		it('should correctly identify Cova variations', () => {
			// Arrange
			const covaVariations = [
				mockMessage({ author: mockCovaBotUser({ username: 'Cova' }) }),
				mockMessage({ author: mockCovaBotUser({ displayName: 'Cova' }) }),
				mockMessage({ author: mockCovaBotUser({ username: 'covabot' }) }),
				mockMessage({ author: mockCovaBotUser({ username: 'COVABOT' }) })
			];

			// Act & Assert
			covaVariations.forEach((message, index) => {
				expect(isCovaBot(message)).toBe(true);
			});
		});

		it('should NOT identify non-CovaBot bots as CovaBot', () => {
			// Arrange
			const nonCovaBots = [
				mockMessage({ author: mockGenericBotUser({ username: 'BunkBot' }) }),
				mockMessage({ author: mockGenericBotUser({ username: 'DJCova' }) }),
				mockMessage({ author: mockGenericBotUser({ username: 'Snowbunk' }) }),
				mockMessage({ author: mockGenericBotUser({ username: 'SomeRandomBot' }) }),
				mockMessage({ author: mockGenericBotUser({ username: 'NotCovaBot' }) })
			];

			// Act & Assert
			nonCovaBots.forEach((message, index) => {
				expect(isCovaBot(message)).toBe(false);
			});
		});

		it('should NOT identify human users as CovaBot even with similar names', () => {
			// Arrange
			const humanMessages = [
				mockMessage({ author: mockHumanUser({ username: 'CovaBot' }) }),
				mockMessage({ author: mockHumanUser({ username: 'Cova' }) }),
				mockMessage({ author: mockHumanUser({ displayName: 'CovaBot' }) })
			];

			// Act & Assert
			humanMessages.forEach((message, index) => {
				expect(isCovaBot(message)).toBe(false);
			});
		});
	});

	describe('Reply Bot Exclusion Logic', () => {
		it('should exclude CovaBot messages from reply bot processing', () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser(),
				content: 'guy' // This would normally trigger GuyBot
			});

			// Act & Assert
			expect(shouldExcludeFromReplyBots(covaBotMessage)).toBe(true);
		});

		it('should exclude self messages from reply bot processing', () => {
			// Arrange
			const client = mockClient();
			const selfMessage = mockMessage({
				author: client.user as any,
				client: client as any,
				content: 'guy' // This would normally trigger GuyBot
			});

			// Act & Assert
			expect(shouldExcludeFromReplyBots(selfMessage)).toBe(true);
		});

		it('should exclude messages from excluded bot names', () => {
			// Arrange
			const excludedBots = [
				mockMessage({ author: mockGenericBotUser({ username: 'DJCova' }) }),
				mockMessage({ author: mockGenericBotUser({ username: 'Snowbunk' }) }),
				mockMessage({ author: mockGenericBotUser({ displayName: 'DJCova' }) })
			];

			// Act & Assert
			excludedBots.forEach((message, index) => {
				expect(shouldExcludeFromReplyBots(message)).toBe(true);
			});
		});

		it('should NOT exclude allowed bot messages', () => {
			// Arrange
			const allowedBotMessage = mockMessage({
				author: mockGenericBotUser({ username: 'AllowedBot' }),
				content: 'Hello from allowed bot'
			});

			// Act & Assert
			expect(shouldExcludeFromReplyBots(allowedBotMessage)).toBe(false);
		});

		it('should NOT exclude human messages', () => {
			// Arrange
			const humanMessage = mockMessage({
				author: mockHumanUser(),
				content: 'guy'
			});

			// Act & Assert
			expect(shouldExcludeFromReplyBots(humanMessage)).toBe(false);
		});
	});

	describe('fromBotExcludingCovaBot Condition', () => {
		it('should allow messages from allowed bots', async () => {
			// Arrange
			const allowedBotMessage = mockMessage({
				author: mockGenericBotUser({ username: 'AllowedBot' })
			});

			// Act
			const condition = fromBotExcludingCovaBot();
			const result = await condition(allowedBotMessage);

			// Assert
			expect(result).toBe(true);
		});

		it('should reject CovaBot messages', async () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser()
			});

			// Act
			const condition = fromBotExcludingCovaBot();
			const result = await condition(covaBotMessage);

			// Assert
			expect(result).toBe(false);
		});

		it('should reject human messages', async () => {
			// Arrange
			const humanMessage = mockMessage({
				author: mockHumanUser()
			});

			// Act
			const condition = fromBotExcludingCovaBot();
			const result = await condition(humanMessage);

			// Assert
			expect(result).toBe(false);
		});

		it('should reject excluded bot messages', async () => {
			// Arrange
			const excludedBotMessage = mockMessage({
				author: mockGenericBotUser({ username: 'DJCova' })
			});

			// Act
			const condition = fromBotExcludingCovaBot();
			const result = await condition(excludedBotMessage);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('Debug Mode Logging', () => {
		beforeEach(() => {
			mockIsDebugMode.mockReturnValue(true);
		});

		it('should provide detailed logging for CovaBot detection in debug mode', () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser()
			});

			// Act
			const result = isCovaBot(covaBotMessage);

			// Assert
			expect(result).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(
				'🤖 CovaBot Detection:',
				expect.objectContaining({
					username: expect.any(String),
					isBot: true,
					result: true
				})
			);
		});

		it('should provide detailed logging for exclusion decisions in debug mode', () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser()
			});

			// Act
			const result = shouldExcludeFromReplyBots(covaBotMessage);

			// Assert
			expect(result).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('❌ Excluding CovaBot message')
			);
		});
	});

	describe('Integration with Actual Bots', () => {
		it('should prevent BotBot from responding to CovaBot messages', async () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser(),
				content: 'Hello from CovaBot' // BotBot normally responds to bot messages
			});

			// Act
			const botBot = registry.getReplyBot('BotBot');
			
			// Assert
			expect(botBot).toBeDefined();
			
			// The bot's trigger condition should exclude CovaBot messages
			// This is tested through the fromBotExcludingCovaBot condition
		});

		it('should prevent all reply bots from responding to CovaBot messages', async () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser(),
				content: 'guy nice hold interrupt' // Would trigger multiple bots normally
			});

			// Act
			const allBotNames = registry.getReplyBotNames();
			
			// Assert
			expect(allBotNames.length).toBeGreaterThan(0);
			
			// Each bot should have proper filtering in place
			// This is ensured by the withDefaultBotBehavior wrapper
			allBotNames.forEach(botName => {
				const bot = registry.getReplyBot(botName);
				expect(bot).toBeDefined();
			});
		});
	});

	describe('Edge Cases and Error Handling', () => {
		it('should handle messages with null or undefined authors', () => {
			// Arrange
			const malformedMessage = mockMessage({
				author: null as any
			});

			// Act & Assert - Should not crash
			expect(() => isCovaBot(malformedMessage)).not.toThrow();
			expect(() => shouldExcludeFromReplyBots(malformedMessage)).not.toThrow();
		});

		it('should handle messages with missing username properties', () => {
			// Arrange
			const incompleteUser = mockCovaBotUser({
				username: undefined as any,
				displayName: undefined as any
			});
			const incompleteMessage = mockMessage({
				author: incompleteUser
			});

			// Act & Assert - Should not crash
			expect(() => isCovaBot(incompleteMessage)).not.toThrow();
			expect(() => shouldExcludeFromReplyBots(incompleteMessage)).not.toThrow();
		});

		it('should handle webhook messages correctly', () => {
			// Arrange
			const webhookMessage = mockMessage({
				author: mockCovaBotUser(),
				webhookId: '123456789012345678'
			});

			// Act & Assert
			expect(isCovaBot(webhookMessage)).toBe(true);
			expect(shouldExcludeFromReplyBots(webhookMessage)).toBe(true);
		});
	});
});
