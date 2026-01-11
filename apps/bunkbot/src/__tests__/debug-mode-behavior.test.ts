import { withChance, fromUser, inChannel, withDefaultBotBehavior } from '../core/conditions';
import {
	mockMessage,
	mockHumanUser,
	mockCovaBotUser,
	mockTestingChannel,
	mockProductionChannel,
} from '../test-utils/test-utils';
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
		error: jest.fn(),
	},
}));

const mockIsDebugMode = isDebugMode as jest.MockedFunction<typeof isDebugMode>;
const _mockSetDebugMode = setDebugMode as jest.MockedFunction<typeof setDebugMode>;

describe('Debug Mode vs Production Mode Behavior', () => {
	const originalRandom = global.Math.random;
	let mockRandomValue = 0.5;

	// Test user IDs (from conditions.ts)
	const TEST_USER_IDS = {
		Cova: '139592376443338752',
		Venn: '123456789012345678',
		Chad: '123456789012345679',
	};

	// Test channel IDs
	const TEST_CHANNEL_IDS = {
		Testing: '123456789012345678',
		Production: '987654321098765432',
	};

	beforeEach(() => {
		// Mock Math.random for deterministic tests
		global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);

		// Clear all mocks
		jest.clearAllMocks();
	});

	afterEach(() => {
		// Restore original Math.random
		global.Math.random = originalRandom;
	});

	describe('Chance-based Conditions', () => {
		describe('Production Mode (DEBUG_MODE=false)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(false);
			});

			it('should respect actual random values for chance conditions', async () => {
				// Arrange: Set unfavorable random value for 5% chance
				mockRandomValue = 0.07; // 7% - above 5% threshold
				const chance = 5;

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(false);
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringContaining(`withChance(${chance}): random=7, result=false`),
				);
			});

			it('should return true when random value is within threshold', async () => {
				// Arrange: Set favorable random value for 5% chance
				mockRandomValue = 0.03; // 3% - within 5% threshold
				const chance = 5;

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(true);
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringContaining(`withChance(${chance}): random=3, result=true`),
				);
			});

			it('should handle edge case at exact threshold', async () => {
				// Arrange: Set random value exactly at threshold
				mockRandomValue = 0.05; // 5% - exactly at threshold
				const chance = 5;

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(true);
			});
		});

		describe('Debug Mode (DEBUG_MODE=true)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(true);
			});

			it('should always return true regardless of random value', async () => {
				// Arrange: Set very unfavorable random value
				mockRandomValue = 0.99; // 99% - would normally fail any reasonable chance
				const chance = 1; // 1% chance

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(true);
			});

			it('should work with zero chance in debug mode', async () => {
				// Arrange
				mockRandomValue = 0.5; // Any value
				const chance = 0; // 0% chance

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(true);
			});

			it('should work with 100% chance in debug mode', async () => {
				// Arrange
				mockRandomValue = 0.5; // Any value
				const chance = 100; // 100% chance

				// Act
				const condition = withChance(chance);
				const _result = await condition();

				// Assert
				expect(_result).toBe(true);
			});
		});
	});

	describe('User-based Conditions', () => {
		describe('Production Mode (DEBUG_MODE=false)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(false);
			});

			it('should match actual user IDs in production', async () => {
				// Arrange
				const covaMessage = mockMessage({
					author: mockHumanUser({ id: TEST_USER_IDS.Cova }),
				});
				const vennMessage = mockMessage({
					author: mockHumanUser({ id: TEST_USER_IDS.Venn }),
				});
				const otherMessage = mockMessage({
					author: mockHumanUser({ id: '999999999999999999' }),
				});

				// Act
				const covaCondition = fromUser(TEST_USER_IDS.Cova);
				const vennCondition = fromUser(TEST_USER_IDS.Venn);

				const covaResult = await covaCondition(covaMessage);
				const vennResult = await vennCondition(vennMessage);
				const covaOtherResult = await covaCondition(otherMessage);

				// Assert
				expect(covaResult).toBe(true);
				expect(vennResult).toBe(true);
				expect(covaOtherResult).toBe(false);
			});
		});

		describe('Debug Mode (DEBUG_MODE=true)', () => {
			beforeEach(() => {
				mockIsDebugMode.mockReturnValue(true);
			});

			it('should work the same as production mode (no special debug behavior)', async () => {
				// Arrange
				const covaMessage = mockMessage({
					author: mockHumanUser({ id: TEST_USER_IDS.Cova }),
				});
				const vennMessage = mockMessage({
					author: mockHumanUser({ id: TEST_USER_IDS.Venn }),
				});
				const chadMessage = mockMessage({
					author: mockHumanUser({ id: TEST_USER_IDS.Chad }),
				});

				// Act
				const covaCondition = fromUser(TEST_USER_IDS.Cova);
				const vennCondition = fromUser(TEST_USER_IDS.Venn);
				const chadCondition = fromUser(TEST_USER_IDS.Chad);

				const covaResult = await covaCondition(covaMessage);
				const vennResult = await vennCondition(vennMessage);
				const chadResult = await chadCondition(chadMessage);

				// Assert: Each condition should match its corresponding user ID
				expect(covaResult).toBe(true); // Cova condition matches Cova message
				expect(vennResult).toBe(true); // Venn condition matches Venn message
				expect(chadResult).toBe(true); // Chad condition matches Chad message
			});
		});
	});

	describe('Channel-based Conditions', () => {
		it('should work the same in both debug and production modes', async () => {
			// Arrange
			const testingMessage = mockMessage({
				channel: mockTestingChannel({ id: TEST_CHANNEL_IDS.Testing }),
			});
			const productionMessage = mockMessage({
				channel: mockProductionChannel({ id: TEST_CHANNEL_IDS.Production }),
			});

			// Act
			const testingCondition = inChannel(TEST_CHANNEL_IDS.Testing);
			const productionCondition = inChannel(TEST_CHANNEL_IDS.Production);

			// Test in both modes
			mockIsDebugMode.mockReturnValue(false);
			const prodTestingResult = await testingCondition(testingMessage);
			const prodProductionResult = await productionCondition(productionMessage);

			mockIsDebugMode.mockReturnValue(true);
			const debugTestingResult = await testingCondition(testingMessage);
			const debugProductionResult = await productionCondition(productionMessage);

			// Assert
			expect(prodTestingResult).toBe(true);
			expect(prodProductionResult).toBe(true);
			expect(debugTestingResult).toBe(true);
			expect(debugProductionResult).toBe(true);
		});
	});

	describe('Enhanced Logging in Debug Mode', () => {
		beforeEach(() => {
			mockIsDebugMode.mockReturnValue(true);
		});

		it('should provide enhanced logging for bot behavior wrapper', async () => {
			// Arrange
			const humanMessage = mockMessage({
				author: mockHumanUser(),
				content: 'test message',
			});

			const testCondition = () => true;
			const botName = 'TestBot';

			// Act
			const wrappedCondition = withDefaultBotBehavior(botName, testCondition);
			const _result = await wrappedCondition(humanMessage);

			// Assert
			expect(_result).toBe(true);
			expect(logger.debug).toHaveBeenCalledWith(
				`[${botName}] ✅ Condition matched`,
				expect.objectContaining({
					author: humanMessage.author.username,
					content: expect.stringContaining('test message'),
					result: true,
				}),
			);
		});

		it('should log when conditions do not match', async () => {
			// Arrange
			const humanMessage = mockMessage({
				author: mockHumanUser(),
				content: 'test message',
			});

			const testCondition = () => false;
			const botName = 'TestBot';

			// Act
			const wrappedCondition = withDefaultBotBehavior(botName, testCondition);
			const _result = await wrappedCondition(humanMessage);

			// Assert
			expect(_result).toBe(false);
			expect(logger.debug).toHaveBeenCalledWith(
				`[${botName}] ❌ Condition did not match`,
				expect.objectContaining({
					author: humanMessage.author.username,
					content: expect.stringContaining('test message'),
					result: false,
				}),
			);
		});

		it('should log when bot messages are excluded', async () => {
			// Arrange
			const covaBotMessage = mockMessage({
				author: mockCovaBotUser(),
				content: 'test message from CovaBot',
			});

			const testCondition = () => true;
			const botName = 'TestBot';

			// Act
			const wrappedCondition = withDefaultBotBehavior(botName, testCondition);
			const _result = await wrappedCondition(covaBotMessage);

			// Assert
			expect(_result).toBe(false);
			expect(logger.debug).toHaveBeenCalledWith(`[${botName}] 🚫 Skipping bot message`);
		});
	});

	describe('Error Handling in Debug Mode', () => {
		beforeEach(() => {
			mockIsDebugMode.mockReturnValue(true);
		});

		it('should log errors and return false when conditions throw', async () => {
			// Arrange
			const message = mockMessage({
				author: mockHumanUser(),
			});

			const errorCondition = () => {
				throw new Error('Test error');
			};
			const botName = 'TestBot';

			// Act
			const wrappedCondition = withDefaultBotBehavior(botName, errorCondition);
			const _result = await wrappedCondition(message);

			// Assert
			expect(_result).toBe(false);
			expect(logger.error).toHaveBeenCalledWith(`[${botName}] 💥 Error in condition:`, expect.any(Error));
		});
	});

	describe('Mode Switching', () => {
		it('should respect mode changes during runtime', async () => {
			// Arrange
			mockRandomValue = 0.99; // 99% - would fail 5% chance in production
			const chance = 5;
			const condition = withChance(chance);

			// Act & Assert: Production mode
			mockIsDebugMode.mockReturnValue(false);
			const prodResult = await condition();
			expect(prodResult).toBe(false);

			// Act & Assert: Debug mode
			mockIsDebugMode.mockReturnValue(true);
			const debugResult = await condition();
			expect(debugResult).toBe(true);
		});
	});

	describe('Performance Considerations', () => {
		it('should not significantly impact performance in production mode', async () => {
			// Arrange
			mockIsDebugMode.mockReturnValue(false);
			const message = mockMessage({
				author: mockHumanUser(),
			});
			const simpleCondition = () => true;
			const botName = 'TestBot';

			// Act
			const start = performance.now();
			const wrappedCondition = withDefaultBotBehavior(botName, simpleCondition);

			// Run multiple times to test performance
			for (let i = 0; i < 100; i++) {
				await wrappedCondition(message);
			}

			const end = performance.now();
			const duration = end - start;

			// Assert: Should complete quickly (less than 100ms for 100 iterations)
			expect(duration).toBeLessThan(100);
		});
	});
});
