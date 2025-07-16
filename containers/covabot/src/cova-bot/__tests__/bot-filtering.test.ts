import { CovaBot, CovaBotConfig } from '../covaBot';
import { getCovaIdentity } from '../../services/identity';
import { BotIdentity } from '../../types/botIdentity';
import { TriggerResponse } from '../../types/triggerResponse';
import { logger } from '@starbunk/shared';
import {
	MockDiscordMessage,
	createBotMessage,
	createCovaBotMessage,
} from '../../__tests__/mocks/discord-mocks';

// Mock dependencies
jest.mock('../../services/identity');
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

const mockGetCovaIdentity = getCovaIdentity as jest.MockedFunction<typeof getCovaIdentity>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot - Bot Filtering Tests', () => {
	let covaBot: CovaBot;
	let covaBotNoSkip: CovaBot;
	let mockIdentity: BotIdentity;
	let testTrigger: TriggerResponse;

	beforeEach(() => {
		jest.clearAllMocks();

		mockIdentity = {
			botName: 'Cova',
			avatarUrl: 'https://cdn.discordapp.com/avatars/123/cova-avatar.png',
		};

		testTrigger = {
			name: 'test-trigger',
			priority: 1,
			condition: jest.fn().mockResolvedValue(true),
			response: jest.fn().mockResolvedValue('Test response'),
		};

		// Bot with bot message filtering enabled (default)
		const configWithSkip: CovaBotConfig = {
			name: 'CovaBot',
			description: 'Test CovaBot with bot filtering',
			defaultIdentity: mockIdentity,
			triggers: [testTrigger],
			skipBotMessages: true,
		};

		// Bot with bot message filtering disabled
		const configNoSkip: CovaBotConfig = {
			name: 'CovaBotNoSkip',
			description: 'Test CovaBot without bot filtering',
			defaultIdentity: mockIdentity,
			triggers: [testTrigger],
			skipBotMessages: false,
		};

		covaBot = new CovaBot(configWithSkip);
		covaBotNoSkip = new CovaBot(configNoSkip);
		mockGetCovaIdentity.mockResolvedValue(mockIdentity);
	});

	describe('Bot Message Filtering (skipBotMessages: true)', () => {
		it('should skip messages from other bots', async () => {
			const botMessage = createBotMessage('Hello from another bot', 'other-bot-123');
			
			await covaBot.processMessage(botMessage as any);

			expect(testTrigger.condition).not.toHaveBeenCalled();
			expect(testTrigger.response).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});

		it('should skip messages from CovaBot itself', async () => {
			const covaBotMessage = createCovaBotMessage('I am speaking', 'bot-client-123');
			
			await covaBot.processMessage(covaBotMessage as any);

			expect(testTrigger.condition).not.toHaveBeenCalled();
			expect(testTrigger.response).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});

		it('should process messages from human users', async () => {
			const humanMessage = new MockDiscordMessage('Hello from human', 'human-user-123', false);
			
			await covaBot.processMessage(humanMessage as any);

			expect(testTrigger.condition).toHaveBeenCalled();
			expect(testTrigger.response).toHaveBeenCalled();
		});

		it('should distinguish between bot and human users correctly', async () => {
			const botMessage = new MockDiscordMessage('Bot message', 'bot-123', true);
			const humanMessage = new MockDiscordMessage('Human message', 'human-123', false);
			
			await covaBot.processMessage(botMessage as any);
			await covaBot.processMessage(humanMessage as any);

			expect(testTrigger.condition).toHaveBeenCalledTimes(1); // Only for human message
			expect(testTrigger.response).toHaveBeenCalledTimes(1);
		});
	});

	describe('Bot Message Processing (skipBotMessages: false)', () => {
		it('should process messages from other bots when filtering disabled', async () => {
			const botMessage = createBotMessage('Hello from another bot', 'other-bot-123');
			
			await covaBotNoSkip.processMessage(botMessage as any);

			expect(testTrigger.condition).toHaveBeenCalled();
			expect(testTrigger.response).toHaveBeenCalled();
		});

		it('should process messages from CovaBot itself when filtering disabled', async () => {
			const covaBotMessage = createCovaBotMessage('I am speaking', 'bot-client-123');
			
			await covaBotNoSkip.processMessage(covaBotMessage as any);

			expect(testTrigger.condition).toHaveBeenCalled();
			expect(testTrigger.response).toHaveBeenCalled();
		});

		it('should still process messages from human users', async () => {
			const humanMessage = new MockDiscordMessage('Hello from human', 'human-user-123', false);
			
			await covaBotNoSkip.processMessage(humanMessage as any);

			expect(testTrigger.condition).toHaveBeenCalled();
			expect(testTrigger.response).toHaveBeenCalled();
		});
	});

	describe('Self-Message Loop Prevention', () => {
		it('should prevent infinite loops by not responding to its own messages', async () => {
			// Create a trigger that would normally respond to any message
			const alwaysRespondTrigger: TriggerResponse = {
				name: 'always-respond',
				priority: 1,
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('Always respond'),
			};

			const loopPreventionConfig: CovaBotConfig = {
				name: 'LoopPreventionBot',
				description: 'Bot that prevents loops',
				defaultIdentity: mockIdentity,
				triggers: [alwaysRespondTrigger],
				skipBotMessages: true, // This should prevent self-responses
			};

			const loopPreventionBot = new CovaBot(loopPreventionConfig);
			
			// Simulate CovaBot's own message
			const selfMessage = createCovaBotMessage('This is my own message', 'bot-client-123');
			
			await loopPreventionBot.processMessage(selfMessage as any);

			expect(alwaysRespondTrigger.condition).not.toHaveBeenCalled();
			expect(alwaysRespondTrigger.response).not.toHaveBeenCalled();
		});

		it('should handle edge case where bot ID matches client user ID', async () => {
			const clientUserId = 'bot-client-123';
			const messageFromSelf = new MockDiscordMessage('Self message', clientUserId, true);
			
			await covaBot.processMessage(messageFromSelf as any);

			expect(testTrigger.condition).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});
	});

	describe('Bot Detection Edge Cases', () => {
		it('should handle undefined bot property gracefully', async () => {
			const messageWithUndefinedBot = new MockDiscordMessage('Test message', 'user-123');
			// Explicitly set bot property to undefined
			messageWithUndefinedBot.author.bot = undefined as any;
			
			await covaBot.processMessage(messageWithUndefinedBot as any);

			// Should treat undefined as false (human user)
			expect(testTrigger.condition).toHaveBeenCalled();
		});

		it('should handle null author gracefully', async () => {
			const messageWithNullAuthor = new MockDiscordMessage('Test message', 'user-123');
			messageWithNullAuthor.author = null as any;
			
			// This should not crash the bot
			await covaBot.processMessage(messageWithNullAuthor as any);

			// Behavior depends on implementation - should either skip or handle gracefully
			// The important thing is that it doesn't crash
		});

		it('should handle messages from webhook bots', async () => {
			// Webhook bots often have specific characteristics
			const webhookMessage = new MockDiscordMessage('Webhook message', 'webhook-123', true);
			
			await covaBot.processMessage(webhookMessage as any);

			expect(testTrigger.condition).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});
	});

	describe('Configuration Validation', () => {
		it('should use default skipBotMessages value when not specified', async () => {
			const defaultConfig: CovaBotConfig = {
				name: 'DefaultBot',
				description: 'Bot with default settings',
				defaultIdentity: mockIdentity,
				triggers: [testTrigger],
				// skipBotMessages not specified
			};

			const defaultBot = new CovaBot(defaultConfig);
			const botMessage = createBotMessage('Bot message', 'other-bot-123');
			
			await defaultBot.processMessage(botMessage as any);

			// Default should be true (skip bot messages)
			expect(testTrigger.condition).not.toHaveBeenCalled();
		});

		it('should respect explicit skipBotMessages: false', async () => {
			const explicitConfig: CovaBotConfig = {
				name: 'ExplicitBot',
				description: 'Bot with explicit settings',
				defaultIdentity: mockIdentity,
				triggers: [testTrigger],
				skipBotMessages: false,
			};

			const explicitBot = new CovaBot(explicitConfig);
			const botMessage = createBotMessage('Bot message', 'other-bot-123');
			
			await explicitBot.processMessage(botMessage as any);

			expect(testTrigger.condition).toHaveBeenCalled();
		});
	});

	describe('Logging and Debugging', () => {
		it('should log when skipping bot messages', async () => {
			const botMessage = createBotMessage('Bot message', 'other-bot-123');
			
			await covaBot.processMessage(botMessage as any);

			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});

		it('should not log skip message for human users', async () => {
			const humanMessage = new MockDiscordMessage('Human message', 'human-123', false);
			
			await covaBot.processMessage(humanMessage as any);

			expect(mockLogger.debug).not.toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});

		it('should provide clear distinction in logs between bot types', async () => {
			const otherBotMessage = createBotMessage('Other bot', 'other-bot-123');
			const selfMessage = createCovaBotMessage('Self message', 'bot-client-123');
			
			await covaBot.processMessage(otherBotMessage as any);
			await covaBot.processMessage(selfMessage as any);

			// Both should result in the same skip message
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
			expect(mockLogger.debug).toHaveBeenCalledTimes(2);
		});
	});

	describe('Performance Considerations', () => {
		it('should skip bot message processing early to avoid unnecessary work', async () => {
			const expensiveTrigger: TriggerResponse = {
				name: 'expensive-trigger',
				priority: 1,
				condition: jest.fn().mockImplementation(async () => {
					// Simulate expensive operation
					await new Promise(resolve => setTimeout(resolve, 100));
					return true;
				}),
				response: jest.fn().mockResolvedValue('Expensive response'),
			};

			const performanceConfig: CovaBotConfig = {
				name: 'PerformanceBot',
				description: 'Bot for performance testing',
				defaultIdentity: mockIdentity,
				triggers: [expensiveTrigger],
				skipBotMessages: true,
			};

			const performanceBot = new CovaBot(performanceConfig);
			const botMessage = createBotMessage('Bot message', 'other-bot-123');
			
			const startTime = Date.now();
			await performanceBot.processMessage(botMessage as any);
			const endTime = Date.now();

			// Should complete quickly without running expensive trigger
			expect(endTime - startTime).toBeLessThan(50);
			expect(expensiveTrigger.condition).not.toHaveBeenCalled();
		});
	});
});
