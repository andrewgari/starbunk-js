import { 
	fromBot, 
	fromBotExcludingCovaBot, 
	fromCovaBot, 
	isCovaBot,
	shouldExcludeFromReplyBots,
	withChance,
	containsWord,
	containsPhrase,
	matchesPattern,
	and,
	or,
	not
} from '../core/conditions';
import { 
	mockMessage, 
	mockHumanUser, 
	mockCovaBotUser, 
	mockGenericBotUser,
	mockClient
} from '../test-utils/testUtils';
import { isDebugMode } from '@starbunk/shared';
// import { logger } from '@starbunk/shared';

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

describe('Bot Trigger Conditions Unit Tests', () => {
	const originalRandom = global.Math.random;
	let mockRandomValue = 0.5;

	beforeEach(() => {
		// Mock Math.random for deterministic tests
		global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);
		
		// Clear all mocks
		jest.clearAllMocks();
		
		// Default to production mode
		mockIsDebugMode.mockReturnValue(false);
	});

	afterEach(() => {
		// Restore original Math.random
		global.Math.random = originalRandom;
	});

	describe('Bot Detection Conditions', () => {
		describe('fromBot()', () => {
			it('should detect bot messages', async () => {
				// Arrange
				const botMessage = mockMessage({
					author: mockGenericBotUser()
				});
				const humanMessage = mockMessage({
					author: mockHumanUser()
				});

				// Act
				const botCondition = fromBot();
				const botResult = await botCondition(botMessage);
				const humanResult = await botCondition(humanMessage);

				// Assert
				expect(botResult).toBe(true);
				expect(humanResult).toBe(false);
			});

			it('should exclude self when includeSelf=false', async () => {
				// Arrange
				const client = mockClient();
				const selfMessage = mockMessage({
					author: client.user as any,
					client: client as any
				});

				// Act
				const excludeSelfCondition = fromBot(false);
				const includeSelfCondition = fromBot(true);
				
				const excludeResult = await excludeSelfCondition(selfMessage);
				const includeResult = await includeSelfCondition(selfMessage);

				// Assert
				expect(excludeResult).toBe(false);
				expect(includeResult).toBe(true);
			});
		});

		describe('isCovaBot()', () => {
			it('should correctly identify CovaBot messages', () => {
				// Arrange
				const covaBotMessage = mockMessage({
					author: mockCovaBotUser()
				});
				const genericBotMessage = mockMessage({
					author: mockGenericBotUser()
				});
				const humanMessage = mockMessage({
					author: mockHumanUser()
				});

				// Act & Assert
				expect(isCovaBot(covaBotMessage)).toBe(true);
				expect(isCovaBot(genericBotMessage)).toBe(false);
				expect(isCovaBot(humanMessage)).toBe(false);
			});

			it('should identify CovaBot by username variations', () => {
				// Arrange
				const covaVariations = [
					mockMessage({ author: mockGenericBotUser({ username: 'CovaBot', bot: true }) }),
					mockMessage({ author: mockGenericBotUser({ username: 'Cova', bot: true }) }),
					mockMessage({ author: mockGenericBotUser({ displayName: 'CovaBot', bot: true }) }),
					mockMessage({ author: mockGenericBotUser({ displayName: 'Cova', bot: true }) })
				];

				// Act & Assert
				covaVariations.forEach(message => {
					expect(isCovaBot(message)).toBe(true);
				});
			});

			it('should handle webhook messages from CovaBot', () => {
				// Arrange
				const webhookMessage = mockMessage({
					author: mockGenericBotUser({ username: 'CovaBot', bot: true }),
					webhookId: '123456789012345678'
				});

				// Act & Assert
				expect(isCovaBot(webhookMessage)).toBe(true);
			});
		});

		describe('shouldExcludeFromReplyBots()', () => {
			it('should exclude CovaBot messages', () => {
				// Arrange
				const covaBotMessage = mockMessage({
					author: mockCovaBotUser()
				});

				// Act & Assert
				expect(shouldExcludeFromReplyBots(covaBotMessage)).toBe(true);
			});

			it('should exclude self messages', () => {
				// Arrange
				const client = mockClient();
				const selfMessage = mockMessage({
					author: client.user as any,
					client: client as any
				});

				// Act & Assert
				expect(shouldExcludeFromReplyBots(selfMessage)).toBe(true);
			});

			it('should not exclude human messages', () => {
				// Arrange
				const humanMessage = mockMessage({
					author: mockHumanUser()
				});

				// Act & Assert
				expect(shouldExcludeFromReplyBots(humanMessage)).toBe(false);
			});

			it('should not exclude allowed bot messages', () => {
				// Arrange
				const allowedBotMessage = mockMessage({
					author: mockGenericBotUser({ username: 'AllowedBot' })
				});

				// Act & Assert
				expect(shouldExcludeFromReplyBots(allowedBotMessage)).toBe(false);
			});
		});

		describe('fromBotExcludingCovaBot()', () => {
			it('should allow generic bot messages', async () => {
				// Arrange
				const genericBotMessage = mockMessage({
					author: mockGenericBotUser()
				});

				// Act
				const condition = fromBotExcludingCovaBot();
				const result = await condition(genericBotMessage);

				// Assert
				expect(result).toBe(true);
			});

			it('should exclude CovaBot messages', async () => {
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

			it('should exclude human messages', async () => {
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
		});

		describe('fromCovaBot()', () => {
			it('should only match CovaBot messages', async () => {
				// Arrange
				const covaBotMessage = mockMessage({
					author: mockCovaBotUser()
				});
				const genericBotMessage = mockMessage({
					author: mockGenericBotUser()
				});
				const humanMessage = mockMessage({
					author: mockHumanUser()
				});

				// Act
				const condition = fromCovaBot();
				const covaResult = await condition(covaBotMessage);
				const botResult = await condition(genericBotMessage);
				const humanResult = await condition(humanMessage);

				// Assert
				expect(covaResult).toBe(true);
				expect(botResult).toBe(false);
				expect(humanResult).toBe(false);
			});
		});
	});

	describe('Chance-based Conditions', () => {
		describe('withChance() in Production Mode', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(false);
			});

			it('should return true when random value is within chance threshold', async () => {
				// Arrange
				mockRandomValue = 0.03; // 3%
				const chance = 5; // 5%

				// Act
				const condition = withChance(chance);
				const result = await condition();

				// Assert
				expect(result).toBe(true);
			});

			it('should return false when random value exceeds chance threshold', async () => {
				// Arrange
				mockRandomValue = 0.07; // 7%
				const chance = 5; // 5%

				// Act
				const condition = withChance(chance);
				const result = await condition();

				// Assert
				expect(result).toBe(false);
			});

			it('should return true at exact threshold boundary', async () => {
				// Arrange
				mockRandomValue = 0.05; // 5%
				const chance = 5; // 5%

				// Act
				const condition = withChance(chance);
				const result = await condition();

				// Assert
				expect(result).toBe(true);
			});
		});

		describe('withChance() in Debug Mode', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(true);
			});

			it('should always return true in debug mode regardless of random value', async () => {
				// Arrange
				mockRandomValue = 0.99; // 99% - would normally fail
				const chance = 5; // 5%

				// Act
				const condition = withChance(chance);
				const result = await condition();

				// Assert
				expect(result).toBe(true);
			});
		});
	});

	describe('Content-based Conditions', () => {
		describe('containsWord()', () => {
			it('should match whole words only', async () => {
				// Arrange
				const wordMessage = mockMessage({ content: 'guy is here' });
				const substringMessage = mockMessage({ content: 'guyish behavior' });

				// Act
				const condition = containsWord('guy');
				const wordResult = await condition(wordMessage);
				const substringResult = await condition(substringMessage);

				// Assert
				expect(wordResult).toBe(true);
				expect(substringResult).toBe(false);
			});

			it('should be case insensitive', async () => {
				// Arrange
				const upperMessage = mockMessage({ content: 'GUY is here' });
				const lowerMessage = mockMessage({ content: 'guy is here' });
				const mixedMessage = mockMessage({ content: 'Guy is here' });

				// Act
				const condition = containsWord('guy');
				const upperResult = await condition(upperMessage);
				const lowerResult = await condition(lowerMessage);
				const mixedResult = await condition(mixedMessage);

				// Assert
				expect(upperResult).toBe(true);
				expect(lowerResult).toBe(true);
				expect(mixedResult).toBe(true);
			});
		});

		describe('containsPhrase()', () => {
			it('should match substrings', async () => {
				// Arrange
				const message = mockMessage({ content: 'this is a test message' });

				// Act
				const condition = containsPhrase('test');
				const result = await condition(message);

				// Assert
				expect(result).toBe(true);
			});

			it('should be case insensitive', async () => {
				// Arrange
				const message = mockMessage({ content: 'This Is A TEST Message' });

				// Act
				const condition = containsPhrase('test');
				const result = await condition(message);

				// Assert
				expect(result).toBe(true);
			});
		});

		describe('matchesPattern()', () => {
			it('should match regex patterns', async () => {
				// Arrange
				const message = mockMessage({ content: 'guy123' });
				const pattern = /guy\d+/i;

				// Act
				const condition = matchesPattern(pattern);
				const result = await condition(message);

				// Assert
				expect(result).toBe(true);
			});
		});
	});

	describe('Logical Operators', () => {
		describe('and()', () => {
			it('should return true when all conditions are true', async () => {
				// Arrange
				const message = mockMessage({ 
					content: 'guy test',
					author: mockHumanUser()
				});

				// Act
				const condition = and(
					containsWord('guy'),
					containsWord('test')
				);
				const result = await condition(message);

				// Assert
				expect(result).toBe(true);
			});

			it('should return false when any condition is false', async () => {
				// Arrange
				const message = mockMessage({ 
					content: 'guy test',
					author: mockHumanUser()
				});

				// Act
				const condition = and(
					containsWord('guy'),
					containsWord('missing')
				);
				const result = await condition(message);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('or()', () => {
			it('should return true when any condition is true', async () => {
				// Arrange
				const message = mockMessage({ 
					content: 'guy test',
					author: mockHumanUser()
				});

				// Act
				const condition = or(
					containsWord('guy'),
					containsWord('missing')
				);
				const result = await condition(message);

				// Assert
				expect(result).toBe(true);
			});

			it('should return false when all conditions are false', async () => {
				// Arrange
				const message = mockMessage({ 
					content: 'guy test',
					author: mockHumanUser()
				});

				// Act
				const condition = or(
					containsWord('missing1'),
					containsWord('missing2')
				);
				const result = await condition(message);

				// Assert
				expect(result).toBe(false);
			});
		});

		describe('not()', () => {
			it('should invert condition results', async () => {
				// Arrange
				const message = mockMessage({ 
					content: 'guy test',
					author: mockHumanUser()
				});

				// Act
				const condition = not(containsWord('guy'));
				const result = await condition(message);

				// Assert
				expect(result).toBe(false);
			});
		});
	});
});
