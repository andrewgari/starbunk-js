import { getDiscordService, DiscordService, logger, container, ServiceId } from '@starbunk/shared';
import { Message, TextChannel, Webhook } from 'discord.js';
import { mockBotIdentity, mockDiscordService, mockMessage, mockUser, mockGuild } from '../../test-utils/testUtils';
import {
	createBotDescription,
	createBotReplyName,
	createReplyBot,
	setBotData,
	createDefaultMessageFilter,
} from '../bot-builder';

// Mock the PrismaClient
const mockBlacklistFindUnique = jest.fn().mockResolvedValue(null);
jest.mock('@prisma/client', () => {
	return {
		PrismaClient: jest.fn().mockImplementation(() => ({
			blacklist: {
				findUnique: mockBlacklistFindUnique,
			},
		})),
	};
});

// Mock the shared package
jest.mock('@starbunk/shared', () => ({
	...jest.requireActual('@starbunk/shared'),
	getDiscordService: jest.fn(),
	logger: {
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('Bot builder', () => {
	let mockDiscordServiceInstance: Partial<DiscordService>;
	let mockWebhookSend: jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
		// Reset the blacklist mock to return null by default (no blacklisted user)
		mockBlacklistFindUnique.mockResolvedValue(null);

		// Create a fresh mock Discord service instance
		mockDiscordServiceInstance = mockDiscordService();
		(getDiscordService as jest.Mock).mockReturnValue(mockDiscordServiceInstance);

		// Register the mock Discord service in the container
		container.register(ServiceId.DiscordService, mockDiscordServiceInstance as DiscordService);

		// Mock webhook functionality
		mockWebhookSend = jest.fn().mockResolvedValue(undefined);
	});

	describe('Type creators', () => {
		describe('createBotReplyName', () => {
			it('should create a valid bot reply name', () => {
				const name = createBotReplyName('TestBot');
				expect(name).toBe('TestBot');
			});

			it('should throw an error for empty name', () => {
				expect(() => createBotReplyName('')).toThrow();
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

	describe('createReplyBot', () => {
		it('should create a bot with the given config', () => {
			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockReturnValue(false),
						response: jest.fn().mockReturnValue('Test response'),
						priority: 10,
					},
				],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);

			expect(bot.name).toBe('TestBot');
			expect(bot.description).toBe('A test bot');
			expect(bot.metadata?.responseRate).toBe(100); // Default response rate
		});

		it('should validate the bot configuration', () => {
			// Missing name
			expect(() =>
				createReplyBot({
					name: '',
					description: 'A test bot',
					defaultIdentity: mockBotIdentity(),
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn(),
						},
					],
				}),
			).toThrow('Bot name is required');

			// Missing description
			expect(() =>
				createReplyBot({
					name: 'TestBot',
					description: '',
					defaultIdentity: mockBotIdentity(),
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn(),
						},
					],
				}),
			).toThrow('Bot description cannot be empty');

			// Missing default identity
			expect(() =>
				createReplyBot({
					name: 'TestBot',
					description: 'A test bot',
					defaultIdentity: null as any,
					triggers: [
						{
							name: 'test-trigger',
							condition: jest.fn(),
							response: jest.fn(),
						},
					],
				}),
			).toThrow('Default bot identity is required');

			// Empty triggers
			expect(() =>
				createReplyBot({
					name: 'TestBot',
					description: 'A test bot',
					defaultIdentity: mockBotIdentity(),
					triggers: [],
				}),
			).toThrow('At least one trigger is required');
		});

		it.skip('should sort triggers by priority', async () => {
			const trigger1 = {
				name: 'low-priority',
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('Low priority response'),
				priority: 1,
			};

			const trigger2 = {
				name: 'high-priority',
				condition: jest.fn().mockResolvedValue(true),
				response: jest.fn().mockResolvedValue('High priority response'),
				priority: 10,
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger1, trigger2],
				discordService: mockDiscordServiceInstance,
			};

			// Mock discord service
			const mockDiscordService = getDiscordService() as jest.Mocked<DiscordService>; // Assuming it's already mocked

			// Create bot and process message
			const bot = createReplyBot(config);
			const message = mockMessage(); // Create the mock message
			await bot.processMessage(message); // Use the created message

			// The high priority trigger should be checked first and short-circuit
			expect(trigger2.condition).toHaveBeenCalled();
			expect(trigger2.response).toHaveBeenCalled();
			expect(trigger1.condition).not.toHaveBeenCalled(); // Lower priority should NOT be called
			expect(trigger1.response).not.toHaveBeenCalled(); // Lower priority should NOT be called
		});

		it('should use default values for optional config', () => {
			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [
					{
						name: 'test-trigger',
						condition: jest.fn().mockReturnValue(false),
						response: jest.fn().mockReturnValue('Test response'),
						// No priority specified
					},
				],
				// No skipBotMessages or responseRate
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			expect(bot.metadata?.responseRate).toBe(100); // Default value
		});

		it('should skip excluded bot messages by default when skipBotMessages is not specified', async () => {
			const trigger = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				// skipBotMessages not specified, should default to true
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const botMessage = mockMessage({
				content: 'Test message',
				author: mockUser({ id: '111222333444555666', username: 'CovaBot', bot: true }),
			});

			await bot.processMessage(botMessage);

			// Should skip the message without checking triggers since CovaBot is excluded
			expect(trigger.condition).not.toHaveBeenCalled();
			expect(trigger.response).not.toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should skip excluded bot messages when configured', async () => {
			const trigger = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				skipBotMessages: true,
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const botMessage = mockMessage({
				content: 'Test message',
				author: mockUser({ id: '111222333444555666', username: 'CovaBot', bot: true }),
			});

			await bot.processMessage(botMessage);

			// Should skip the message without checking triggers since CovaBot is excluded
			expect(trigger.condition).not.toHaveBeenCalled();
			expect(trigger.response).not.toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should process bot messages when skipBotMessages is explicitly set to false', async () => {
			const trigger = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				skipBotMessages: false, // Explicitly allow bot messages
				discordService: mockDiscordServiceInstance,
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const botMessage = mockMessage({
				content: 'Test message',
				author: mockUser({ id: '111222333444555666', username: 'CovaBot', bot: true }),
			});

			await bot.processMessage(botMessage);

			// Should process the message since skipBotMessages is false
			expect(trigger.condition).toHaveBeenCalled();
			expect(trigger.response).toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				botMessage.channel.id,
				mockBotIdentity(),
				'Test response',
			);
		});

		it.skip('should skip messages from any blacklisted user', async () => {
			// Configure the mock to return a blacklisted record for a specific user
			mockBlacklistFindUnique.mockResolvedValue({
				id: 'blacklist-1',
				guildId: 'test-guild-id',
				userId: 'blacklisted-user-id',
				createdAt: new Date(),
			});

			const trigger = {
				name: 'test-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Test response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);

			// Set up blacklist data for the user
			setBotData('TestBot', 'blacklist:test-guild-id:blacklisted-user-id', true);

			// Create a mock message for a blacklisted user
			const blacklistedMessage = mockMessage({
				content: 'Test message',
				author: mockUser({
					id: 'blacklisted-user-id',
					username: 'blacklisted-user',
					bot: false,
				}),
				guild: mockGuild({ id: 'test-guild-id' }),
			});

			await bot.processMessage(blacklistedMessage);

			// Verify the message was skipped (triggers not called)
			expect(trigger.condition).not.toHaveBeenCalled();
			expect(trigger.response).not.toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/Skipping message from blacklisted user/));
		});

		it.skip('should continue to next trigger if condition fails', async () => {
			const trigger1 = {
				name: 'failing-trigger',
				condition: jest.fn().mockReturnValue(false),
				response: jest.fn().mockReturnValue('Trigger 1 response'),
			};

			const trigger2 = {
				name: 'matching-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Trigger 2 response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger1, trigger2],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should check both triggers but only call response on the matching one
			expect(trigger1.condition).toHaveBeenCalled();
			expect(trigger1.response).not.toHaveBeenCalled();
			expect(trigger2.condition).toHaveBeenCalled();
			expect(trigger2.response).toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				mockBotIdentity(),
				'Trigger 2 response',
			);
		});

		it.skip('should not send empty responses', async () => {
			const trigger = {
				name: 'empty-response',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue(''),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			expect(trigger.condition).toHaveBeenCalled();
			expect(trigger.response).toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(expect.stringMatching(/Empty response from trigger/));
		});

		it.skip('should handle errors in trigger conditions', async () => {
			const errorTrigger = {
				name: 'error-trigger',
				condition: jest.fn().mockImplementation(() => {
					throw new Error('Test error');
				}),
				response: jest.fn(),
			};

			const fallbackTrigger = {
				name: 'fallback-trigger',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Fallback response'),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [errorTrigger, fallbackTrigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should log the error and continue to the next trigger
			expect(errorTrigger.condition).toHaveBeenCalled();
			expect(errorTrigger.response).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(expect.stringMatching(/Error in trigger/), expect.any(Error));

			// Should fall back to the next trigger
			expect(fallbackTrigger.condition).toHaveBeenCalled();
			expect(fallbackTrigger.response).toHaveBeenCalled();
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				mockBotIdentity(),
				'Fallback response',
			);
		});

		it.skip('should use trigger-specific identity if provided', async () => {
			const customIdentity = {
				botName: 'CustomBot',
				avatarUrl: 'https://example.com/custom.jpg',
			};

			const trigger = {
				name: 'custom-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Custom response'),
				identity: customIdentity,
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should use the trigger-specific identity
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				customIdentity,
				'Custom response',
			);
		});

		it.skip('should handle identity function', async () => {
			const customIdentity = {
				botName: 'DynamicBot',
				avatarUrl: 'https://example.com/dynamic.jpg',
			};

			const trigger = {
				name: 'dynamic-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Dynamic response'),
				identity: jest.fn().mockReturnValue(customIdentity),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should call the identity function and use its result
			expect(trigger.identity).toHaveBeenCalledWith(message);
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				customIdentity,
				'Dynamic response',
			);
		});

		it.skip('should handle errors in identity function', async () => {
			const trigger = {
				name: 'error-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Response with error'),
				identity: jest.fn().mockImplementation(() => {
					throw new Error('Identity error');
				}),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should log the error and skip sending the message
			expect(trigger.identity).toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/Failed to get bot identity/),
				expect.any(Error),
			);
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it.skip('should handle invalid identity result', async () => {
			const trigger = {
				name: 'invalid-identity',
				condition: jest.fn().mockReturnValue(true),
				response: jest.fn().mockReturnValue('Response with invalid identity'),
				identity: jest.fn().mockRejectedValue(new Error('Identity service failed')),
			};

			const config = {
				name: 'TestBot',
				description: 'A test bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [trigger],
				discordService: mockDiscordServiceInstance,
			};

			const bot = createReplyBot(config);
			const message = mockMessage({ content: 'Test message' });

			await bot.processMessage(message);

			// Should log the error and skip sending the message
			expect(trigger.identity).toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringMatching(/Failed to get bot identity/),
				expect.any(Error),
			);
			expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		// Add tests specifically for responseRate
		describe.skip('responseRate handling', () => {
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
					defaultIdentity: mockBotIdentity(),
					triggers: [trigger],
					responseRate: 0,
					discordService: mockDiscordServiceInstance,
				};

				const bot = createReplyBot(config);
				const message = mockMessage({ content: 'Test message' });

				await bot.processMessage(message);

				// Should exit due to responseRate before checking condition
				expect(trigger.response).not.toHaveBeenCalled();
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).not.toHaveBeenCalled();
				expect(logger.debug).toHaveBeenCalledWith(
					expect.stringMatching(/Skipping message due to response rate/),
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
					defaultIdentity: mockBotIdentity(),
					triggers: [trigger],
					responseRate: 100,
					discordService: mockDiscordServiceInstance,
				};

				const bot = createReplyBot(config);
				const message = mockMessage({ content: 'Test message' });

				await bot.processMessage(message);

				// Should proceed past responseRate check and process the trigger
				expect(trigger.condition).toHaveBeenCalled();
				expect(trigger.response).toHaveBeenCalled();
				expect(mockDiscordServiceInstance.sendMessageWithBotIdentity).toHaveBeenCalledWith(
					message.channel.id,
					mockBotIdentity(),
					'Should send',
				);
			});
		});
	});
});

describe('createDefaultMessageFilter', () => {
	describe('default behavior (respondsToBots not set)', () => {
		const config = {
			name: 'TestBot',
			description: 'A test bot',
			defaultIdentity: mockBotIdentity(),
			triggers: [],
		};

		it('should skip excluded bot messages (CovaBot)', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '123456789012345678',
					username: 'CovaBot',
					bot: true,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(true); // true means skip
		});

		it('should skip non-excluded bot messages by default', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '123456789012345678',
					username: 'SomeOtherBot',
					bot: true,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(true); // true means skip (default behavior)
		});

		it('should allow human user messages', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '123456789012345678',
					username: 'HumanUser',
					bot: false,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(false); // false means don't skip (allow)
		});

		it('should handle null/undefined message gracefully', async () => {
			const filter = createDefaultMessageFilter(config);
			const result = await filter(null as any);
			expect(result).toBe(true); // Skip malformed messages
		});

		it('should handle message without author gracefully', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({ content: 'test' });
			message.author = null as any;

			const result = await filter(message);
			expect(result).toBe(true); // Skip malformed messages
		});
	});

	describe('respondsToBots: true (BotBot behavior)', () => {
		const config = {
			name: 'BotBot',
			description: 'Responds to bots',
			defaultIdentity: mockBotIdentity(),
			triggers: [],
			respondsToBots: true,
		};

		it('should skip human messages', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '123456789012345678',
					username: 'HumanUser',
					bot: false,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(true); // true means skip
		});

		it('should allow non-excluded bot messages', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '987654321098765432',
					username: 'SomeOtherBot',
					bot: true,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(false); // false means allow
		});

		it('should skip excluded bot messages (CovaBot)', async () => {
			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: '123456789012345678',
					username: 'CovaBot',
					bot: true,
				}),
			});

			const result = await filter(message);
			expect(result).toBe(true); // true means skip (excluded)
		});

		it('should skip self messages', async () => {
			const filter = createDefaultMessageFilter(config);
			const clientId = '111222333444555666';
			const message = mockMessage({
				content: 'test',
				author: mockUser({
					id: clientId,
					username: 'BotBot',
					bot: true,
				}),
			});
			message.client = {
				user: mockUser({ id: clientId }),
			} as any;

			const result = await filter(message);
			expect(result).toBe(true); // true means skip (self-message)
		});
	});

	describe('responseChance configuration', () => {
		it('should allow message when random is below responseChance', async () => {
			jest.spyOn(Math, 'random').mockReturnValue(0.005); // 0.5%

			const config = {
				name: 'ChanceBot',
				description: 'Responds with 1% chance',
				defaultIdentity: mockBotIdentity(),
				triggers: [],
				responseChance: 1,
			};

			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({ bot: false }),
			});

			const result = await filter(message);
			expect(result).toBe(false); // false means allow (0.5% < 1%)
		});

		it('should skip message when random is above responseChance', async () => {
			jest.spyOn(Math, 'random').mockReturnValue(0.99); // 99%

			const config = {
				name: 'ChanceBot',
				description: 'Responds with 1% chance',
				defaultIdentity: mockBotIdentity(),
				triggers: [],
				responseChance: 1,
			};

			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({ bot: false }),
			});

			const result = await filter(message);
			expect(result).toBe(true); // true means skip (99% > 1%)
		});

		it('should work without responseChance set', async () => {
			const config = {
				name: 'NormalBot',
				description: 'Normal bot',
				defaultIdentity: mockBotIdentity(),
				triggers: [],
			};

			const filter = createDefaultMessageFilter(config);
			const message = mockMessage({
				content: 'test',
				author: mockUser({ bot: false }),
			});

			const result = await filter(message);
			expect(result).toBe(false); // false means allow (no chance restriction)
		});
	});

	describe('combined respondsToBots and responseChance', () => {
		it('should apply both filters correctly', async () => {
			jest.spyOn(Math, 'random').mockReturnValue(0.005); // 0.5%

			const config = {
				name: 'BotBot',
				description: 'Responds to bots with 1% chance',
				defaultIdentity: mockBotIdentity(),
				triggers: [],
				respondsToBots: true,
				responseChance: 1,
			};

			const filter = createDefaultMessageFilter(config);

			// Human message should be skipped regardless of chance
			const humanMessage = mockMessage({
				content: 'test',
				author: mockUser({ id: '123', username: 'Human', bot: false }),
			});
			expect(await filter(humanMessage)).toBe(true); // Skip human

			// Bot message should pass both filters
			const botMessage = mockMessage({
				content: 'test',
				author: mockUser({ id: '456', username: 'OtherBot', bot: true }),
			});
			expect(await filter(botMessage)).toBe(false); // Allow bot (within chance)
		});
	});
});
