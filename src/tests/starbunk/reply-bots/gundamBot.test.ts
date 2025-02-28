// Set up mocks before imports
jest.mock('../../../starbunk/bots/triggers/conditions/patternCondition');
jest.mock('../../../webhooks/webhookService');

import { Message, TextChannel, User } from 'discord.js';
import createGundamBot from '../../../starbunk/bots/reply-bots/gundamBot';
import { PatternCondition } from '../../../starbunk/bots/triggers/conditions/patternCondition';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { createMockGuildMember, createMockMessage } from '../../mocks/discordMocks';

describe('GundamBot', () => {
	// Mocks setup
	const mockWebhookService = {
		writeMessage: jest.fn().mockResolvedValue(undefined),
	};

	// Mock the PatternCondition to control when patterns match
	let patternShouldTriggerResponse = true;

	beforeAll(() => {
		// Make webhookService.writeMessage use our mock
		(webhookService.writeMessage as jest.Mock).mockImplementation(
			mockWebhookService.writeMessage
		);

		// Mock PatternCondition constructor and shouldTrigger method
		(PatternCondition as jest.MockedClass<typeof PatternCondition>).mockImplementation(() => {
			return {
				shouldTrigger: jest.fn().mockImplementation(() => patternShouldTriggerResponse),
			} as unknown as PatternCondition;
		});
	});

	beforeEach(() => {
		// Reset mocks before each test
		mockWebhookService.writeMessage.mockClear();
		(webhookService.writeMessage as jest.Mock).mockClear();
		patternShouldTriggerResponse = true;
	});

	describe('bot configuration', () => {
		it('should have correct name', () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService); // Keep as 'any' since WebhookService type isn't available

			// Act
			const identity = gundamBot.getIdentity();

			// Assert
			expect(identity.name).toBe('GundamBot');
		});

		it('should have correct avatar URL', () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);

			// Act
			const identity = gundamBot.getIdentity();

			// Assert
			expect(identity.avatarUrl).toBe('https://i.imgur.com/WuBBl0A.png');
		});
	});

	describe('message handling', () => {
		it('should ignore messages from bots', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMember = createMockGuildMember('bot-id', 'BotUser');
			const mockMessage = createMockMessage('BotUser');
			mockMessage.author = { ...mockMember.user, bot: true } as User;
			mockMessage.content = 'gundam';

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should respond to "gundam" as a standalone word', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'gundam';

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://i.imgur.com/WuBBl0A.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "GUNDAM" (case insensitive)', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'GUNDAM';

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://i.imgur.com/WuBBl0A.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "gandam" (misspelling)', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'gandam';

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://i.imgur.com/WuBBl0A.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should respond to "gundam" in a sentence', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'I love watching gundam anime';

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					username: 'GundamBot',
					avatarURL: 'https://i.imgur.com/WuBBl0A.png',
					content: "That's the giant unicorn robot gandam, there i said it"
				})
			);
		});

		it('should NOT respond to words containing "gundam" as a substring', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'gundamium';
			patternShouldTriggerResponse = false;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		it('should NOT respond to unrelated messages', async () => {
			// Arrange
			const gundamBot = createGundamBot(mockWebhookService as unknown as WebhookService);
			const mockMessage = createMockMessage('TestUser');
			mockMessage.content = 'Hello there!';
			patternShouldTriggerResponse = false;

			// Act
			await gundamBot.handleMessage(mockMessage as Message<boolean>);

			// Assert
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});
	});
});
