import { DiscordService } from '../../../../services/discordService';
import { logger } from '../../../../services/logger';
import { getDiscordService } from '@/services/bootstrap';
import { mockBotIdentity, mockDiscordService, mockMessage } from '../../test-utils/testUtils';
import { createBotDescription, createBotStrategyName, createStrategyBot } from '../bot-builder';

// Mock the logger
jest.mock('../../../../services/logger');

describe('Bot builder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Type creators', () => {
		describe('createBotStrategyName', () => {
			it('should create a valid bot strategy name', () => {
				const name = createBotStrategyName('TestBot');
				expect(name).toBe('TestBot');
			});

			it('should throw an error for empty name', () => {
				expect(() => createBotStrategyName('')).toThrow();
			});
		});

		describe('createBotDescription', () => {
			it('should create a valid bot description', () => {
				const description = createBotDescription('A test bot');
				expect(description).toBe('A test bot');
			});

			it('should throw an error for empty description', () => {
				expect(() => createBotDescription('')).toThrow('Bot description cannot be empty');
				expect(() => createBotDescription('  ')).toThrow('Bot description cannot be empty');
			});
		});
	});

	describe('createStrategyBot', () => {
		it('should create a bot with the given config', () => {
			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockReturnValue(false),
						response: jest.fn().mockReturnValue('Test response'),
						priority: 10
					}
				]
			};

			const bot = createStrategyBot(config);

			expect(bot.name).toBe('TestBot');
			expect(bot.description).toBe('A test bot');
			expect(bot.metadata?.responseRate).toBe(100); // Default response rate
		});

		it('should validate the bot configuration', () => {
			// Missing name
			expect(() => createStrategyBot({
				name: '',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [{
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn()
				}]
			})).toThrow('Bot name is required');

			// Missing description
			expect(() => createStrategyBot({
				name: 'TestBot',
				description: '',
				defaultIdentity: mockBotIdentity,
				triggers: [{
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn()
				}]
			})).toThrow('Bot description cannot be empty');

			// Missing default identity
			expect(() => createStrategyBot({
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: null as any,
				triggers: [{
					name: 'test-trigger',
					condition: jest.fn(),
					response: jest.fn()
				}]
			})).toThrow('Default bot identity is required');

			// Empty triggers
			expect(() => createStrategyBot({
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: []
			})).toThrow('At least one trigger is required');
		});

		it('should sort triggers by priority', async () => {
			const trigger1 = {
				name: 'low-priority',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Low priority response'),
				priority: 1
			};

			const trigger2 = {
				name: 'high-priority',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('High priority response'),
				priority: 10
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger1, trigger2]
			};

			// Mock discord service
			const mockDiscordService = getDiscordService() as jest.Mocked<DiscordService>; // Assuming it's already mocked

			// Create bot and process message
			const bot = createStrategyBot(config);
			const message = mockMessage(); // Create the mock message
			await bot.processMessage(message); // Use the created message

			// The high priority trigger should be checked first and short-circuit
			expect(trigger2.condition).toHaveBeenCalled();
			expect(trigger2.response).toHaveBeenCalled();
			expect(trigger1.condition).not.toHaveBeenCalled(); // Lower priority should NOT be called
			expect(trigger1.response).not.toHaveBeenCalled(); // Lower priority should NOT be called
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id, // Use the created message's channel id
				config.defaultIdentity, // Expect default identity as triggers don't define one
				'High priority response' // Expect response from trigger2
			);
		});

		it('should use default values for optional config', () => {
			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockReturnValue(false),
						response: jest.fn().mockReturnValue('Test response')
						// No priority specified
					}
				]
				// No skipBotMessages or responseRate
			};

			const bot = createStrategyBot(config);
			expect(bot.metadata?.responseRate).toBe(100); // Default value
		});

		it('should skip bot messages when configured', async () => {
			const trigger = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response')
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger],
				skipBotMessages: true
			};

			const bot = createStrategyBot(config);
			const botMessage = mockMessage('Test message', 'BotUser', true);

			await bot.processMessage(botMessage);

			// Should skip the message without checking triggers
			expect(trigger.condition).not.toHaveBeenCalled();
			expect(trigger.response).not.toHaveBeenCalled();
			expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should continue to next trigger if condition fails', async () => {
			const trigger1 = {
				name: 'failing-trigger',
				condition: jest.fn().mockReturnValue(false),
				response: jest.fn().mockReturnValue('Trigger 1 response')
			};

			const trigger2 = {
				name: 'matching-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Trigger 2 response')
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger1, trigger2]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should check both triggers but only call response on the matching one
			expect(trigger1.condition).toHaveBeenCalled();
			expect(trigger1.response).not.toHaveBeenCalled();
			expect(trigger2.condition).toHaveBeenCalled();
			expect(trigger2.response).toHaveBeenCalled();
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				mockBotIdentity,
				'Trigger 2 response'
			);
		});

		it('should not send empty responses', async () => {
			const trigger = {
				name: 'empty-response',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('')
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			expect(trigger.condition).toHaveBeenCalled();
			expect(trigger.response).toHaveBeenCalled();
			expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringMatching(/Empty response from trigger/)
			);
		});

		it('should handle errors in trigger conditions', async () => {
			const errorTrigger = {
				name: 'error-trigger',
				condition: jest.fn().mockImplementation(() => {
					throw new Error('Test error');
				}),
				response: jest.fn()
			};

			const fallbackTrigger = {
				name: 'fallback-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Fallback response')
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [errorTrigger, fallbackTrigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should log the error and continue to the next trigger
			expect(errorTrigger.condition).toHaveBeenCalled();
			expect(errorTrigger.response).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/Error in trigger/),
				expect.any(Error)
			);

			// Should fall back to the next trigger
			expect(fallbackTrigger.condition).toHaveBeenCalled();
			expect(fallbackTrigger.response).toHaveBeenCalled();
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				mockBotIdentity,
				'Fallback response'
			);
		});

		it('should use trigger-specific identity if provided', async () => {
			const customIdentity = {
				botName: 'CustomBot',
				avatarUrl: 'https://example.com/custom.jpg'
			};

			const trigger = {
				name: 'custom-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Custom response'),
				identity: customIdentity
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should use the trigger-specific identity
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				customIdentity,
				'Custom response'
			);
		});

		it('should handle identity function', async () => {
			const customIdentity = {
				botName: 'DynamicBot',
				avatarUrl: 'https://example.com/dynamic.jpg'
			};

			const trigger = {
				name: 'dynamic-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Dynamic response'),
				identity: jest.fn().mockReturnValue(customIdentity)
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should call the identity function and use its result
			expect(trigger.identity).toHaveBeenCalledWith(message);
			expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				customIdentity,
				'Dynamic response'
			);
		});

		it('should handle errors in identity function', async () => {
			const trigger = {
				name: 'error-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Response with error'),
				identity: jest.fn().mockImplementation(() => {
					throw new Error('Identity error');
				})
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should log the error and skip sending the message
			expect(trigger.identity).toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/Failed to get bot identity/),
				expect.any(Error)
			);
			expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should handle invalid identity result', async () => {
			const trigger = {
				name: 'invalid-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Response with invalid identity'),
				identity: jest.fn().mockReturnValue(null)
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity,
				triggers: [trigger]
			};

			const bot = createStrategyBot(config);
			const message = mockMessage('Test message');

			await bot.processMessage(message);

			// Should log the error and skip sending the message
			expect(trigger.identity).toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/Failed to get bot identity/),
				expect.any(Error)
			);
			expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		// Add tests specifically for responseRate
		describe('responseRate handling', () => {
			it('should not respond when responseRate is 0', async () => {
				jest.spyOn(Math, 'random').mockReturnValue(0);

				const trigger = {
					name: 'always-true',
					condition: jest.fn().mockReturnValue(true),
					response: jest.fn().mockReturnValue('Should not send'),
				};
				const config = {
					name: 'ZeroRateBot',
					description: 'A bot that never responds',
					defaultIdentity: mockBotIdentity,
					triggers: [trigger],
					responseRate: 0,
				};

				const bot = createStrategyBot(config);
				const message = mockMessage('Test message');

				await bot.processMessage(message);

				// Should exit due to responseRate before checking condition
				expect(trigger.response).not.toHaveBeenCalled();
				expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringMatching(/Skipping message due to response rate/)
				);
			});

			it('should always attempt to respond when responseRate is 100', async () => {
				const trigger = {
					name: 'always-true',
					condition: jest.fn().mockReturnValue(true),
					response: jest.fn().mockReturnValue('Should send'),
				};
				const config = {
					name: 'FullRateBot',
					description: 'A bot that always responds',
					defaultIdentity: mockBotIdentity,
					triggers: [trigger],
					responseRate: 100,
				};

				const bot = createStrategyBot(config);
				const message = mockMessage('Test message');

				await bot.processMessage(message);

				// Should proceed past responseRate check and process the trigger
				expect(trigger.condition).toHaveBeenCalled();
				expect(trigger.response).toHaveBeenCalled();
				expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
					message.channel.id,
					mockBotIdentity,
					'Should send'
				);
			});
		});
	});
});
