import { CovaBot } from '../covaBot';
import { getCovaIdentity } from '../../services/identity';
import { Message, TextChannel, Client } from 'discord.js';
import { logger } from '@starbunk/shared';

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

// Mock the identity service functions
jest.mock('../../services/identity', () => ({
	getCovaIdentity: jest.fn(),
}));

const mockGetCovaIdentity = getCovaIdentity as jest.MockedFunction<typeof getCovaIdentity>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot', () => {
	let covaBot: CovaBot;
	let mockMessage: Message;
	let mockChannel: TextChannel;
	let mockClient: Client;

	const mockIdentity = {
		botName: 'ServerCova',
		avatarUrl: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
	};

	const mockTrigger = {
		name: 'test-trigger',
		priority: 1,
		condition: jest.fn(),
		response: jest.fn(),
		identity: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock channel - ensure it's properly recognized as TextChannel
		mockChannel = {
			id: 'test-channel-123',
			type: 0, // GUILD_TEXT channel type
			send: jest.fn(),
			fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
			createWebhook: jest.fn().mockResolvedValue({ send: jest.fn() }),
		} as unknown as TextChannel;

		// Make sure instanceof check works
		Object.setPrototypeOf(mockChannel, TextChannel.prototype);

		// Setup mock client
		mockClient = {
			user: {
				id: 'bot-user-123',
				displayAvatarURL: jest.fn(() => 'https://cdn.discordapp.com/avatars/bot/avatar.png'),
			},
		} as unknown as Client;

		// Setup mock message
		mockMessage = {
			content: 'Hello CovaBot!',
			author: {
				id: 'user-123',
				bot: false,
			},
			guild: {
				id: 'test-guild-123',
			},
			channel: mockChannel,
			client: mockClient,
		} as unknown as Message;

		// Setup CovaBot with test trigger
		covaBot = new CovaBot({
			name: 'TestCovaBot',
			description: 'Test CovaBot instance',
			defaultIdentity: {
				botName: 'DefaultCova',
				avatarUrl: 'https://default-avatar.png',
			},
			triggers: [mockTrigger],
		});
	});

	describe('processMessage', () => {
		it('should process message and send response with Cova identity', async () => {
			// Arrange
			mockTrigger.condition.mockResolvedValue(true);
			mockTrigger.response.mockResolvedValue('Hello there!');
			mockGetCovaIdentity.mockResolvedValue(mockIdentity);

			const mockWebhook = {
				send: jest.fn().mockResolvedValue(undefined),
			};
			// Mock fetchWebhooks to return empty collection (no existing webhooks)
			const mockWebhooksCollection = {
				find: jest.fn().mockReturnValue(undefined), // No existing webhook found
			};
			(mockChannel.fetchWebhooks as jest.Mock).mockResolvedValue(mockWebhooksCollection as any);
			(mockChannel.createWebhook as jest.Mock).mockResolvedValue(mockWebhook as any);

			// Act
			await covaBot.processMessage(mockMessage);

			// Assert
			expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
			expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);
			expect(mockGetCovaIdentity).toHaveBeenCalledWith(mockMessage);
			expect(mockChannel.fetchWebhooks).toHaveBeenCalled();
			expect(mockChannel.createWebhook).toHaveBeenCalledWith({
				name: 'CovaBot Webhook',
				avatar: 'https://cdn.discordapp.com/avatars/bot/avatar.png',
			});
			expect(mockWebhook.send).toHaveBeenCalledWith({
				content: 'Hello there!',
				username: 'ServerCova',
				avatarURL: 'https://cdn.discordapp.com/avatars/123/server-avatar.png',
			});
		});

		it('should remain silent when identity resolution fails', async () => {
			// Arrange
			mockTrigger.condition.mockResolvedValue(true);
			mockTrigger.response.mockResolvedValue('Hello there!');
			mockGetCovaIdentity.mockResolvedValue(null); // Identity resolution fails

			// Act
			await covaBot.processMessage(mockMessage);

			// Assert
			expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
			expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);
			expect(mockGetCovaIdentity).toHaveBeenCalledWith(mockMessage);
			expect(mockChannel.send).not.toHaveBeenCalled();
			expect(mockChannel.createWebhook).not.toHaveBeenCalled();
		});

		it('should skip processing when trigger condition fails', async () => {
			// Arrange
			mockTrigger.condition.mockResolvedValue(false);

			// Act
			await covaBot.processMessage(mockMessage);

			// Assert
			expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
			expect(mockTrigger.response).not.toHaveBeenCalled();
			expect(mockGetCovaIdentity).not.toHaveBeenCalled();
			expect(mockChannel.send).not.toHaveBeenCalled();
		});

		it('should skip bot messages when configured', async () => {
			// Arrange
			const botMessage = {
				...mockMessage,
				author: {
					...mockMessage.author,
					bot: true,
				},
			} as Message;

			// Act
			await covaBot.processMessage(botMessage);

			// Assert
			expect(mockTrigger.condition).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Skipping bot message');
		});

		it('should handle disabled bot', async () => {
			// Arrange
			const disabledBot = new CovaBot({
				name: 'DisabledCovaBot',
				description: 'Disabled test bot',
				defaultIdentity: mockIdentity,
				triggers: [mockTrigger],
				disabled: true,
			});

			// Act
			await disabledBot.processMessage(mockMessage);

			// Assert
			expect(mockTrigger.condition).not.toHaveBeenCalled();
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Bot is disabled, skipping message');
		});

		it('should fallback to regular message when webhook fails', async () => {
			// Arrange
			mockTrigger.condition.mockResolvedValue(true);
			mockTrigger.response.mockResolvedValue('Hello there!');
			mockGetCovaIdentity.mockResolvedValue(mockIdentity);

			// Mock webhook operations to fail, forcing fallback to regular message
			(mockChannel.fetchWebhooks as jest.Mock).mockRejectedValue(new Error('Webhook error'));
			(mockChannel.createWebhook as jest.Mock).mockRejectedValue(new Error('Create webhook error'));

			// Act
			await covaBot.processMessage(mockMessage);

			// Assert
			expect(mockChannel.send).toHaveBeenCalledWith('Hello there!');
			expect(mockLogger.debug).toHaveBeenCalledWith('[CovaBot] Fallback message sent via regular channel');
		});

		it('should process triggers in priority order', async () => {
			// Arrange
			const lowPriorityTrigger = {
				...mockTrigger,
				name: 'low-priority',
				priority: 1,
				condition: jest.fn().mockResolvedValue(true),
			};

			const highPriorityTrigger = {
				...mockTrigger,
				name: 'high-priority',
				priority: 10,
				condition: jest.fn().mockResolvedValue(true),
			};

			const botWithMultipleTriggers = new CovaBot({
				name: 'MultiTriggerBot',
				description: 'Bot with multiple triggers',
				defaultIdentity: mockIdentity,
				triggers: [lowPriorityTrigger, highPriorityTrigger], // Added in reverse priority order
			});

			mockGetCovaIdentity.mockResolvedValue(mockIdentity);
			const mockWebhook = { send: jest.fn() };
			(mockChannel.fetchWebhooks as jest.Mock).mockResolvedValue(new Map());
			(mockChannel.createWebhook as jest.Mock).mockResolvedValue(mockWebhook as any);

			// Act
			await botWithMultipleTriggers.processMessage(mockMessage);

			// Assert
			// High priority trigger should be processed first
			expect(highPriorityTrigger.condition).toHaveBeenCalled();
			// Low priority trigger should not be processed since high priority succeeded
			expect(lowPriorityTrigger.condition).not.toHaveBeenCalled();
		});
	});

	describe('metadata', () => {
		it('should return correct metadata', () => {
			// Act
			const metadata = covaBot.metadata;

			// Assert
			expect(metadata).toEqual({
				responseRate: 100,
				disabled: false,
			});
		});
	});

	describe('properties', () => {
		it('should return correct name and description', () => {
			// Assert
			expect(covaBot.name).toBe('TestCovaBot');
			expect(covaBot.description).toBe('Test CovaBot instance');
		});
	});
});
