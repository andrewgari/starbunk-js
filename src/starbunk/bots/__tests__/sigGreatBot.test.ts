// Mock the webhook service
jest.mock('../../../webhooks/webhookService', () => ({
	writeMessage: jest.fn()
}));

// Mock the botConstants module
jest.mock('../botConstants', () => ({
	getCurrentMemberIdentity: jest.fn()
}));

import { Message } from 'discord.js';
import { getCurrentMemberIdentity } from '../botConstants';
import SigGreatBot from '../reply-bots/sigGreatBot';
import { createMockMessage, MockWebhookService, setupTestContainer } from './testUtils';

describe('SigGreatBot', () => {
	let sigGreatBot: SigGreatBot;
	let message: Message<boolean>;
	let mockWebhookService: MockWebhookService;

	beforeEach(() => {
		jest.clearAllMocks();
		// Set up container with mock services
		setupTestContainer();
		// Get the mock webhook service from the container
		mockWebhookService = new MockWebhookService();
		// Create bot after setting up container
		sigGreatBot = new SigGreatBot();
		// @ts-expect-error - Set the webhook service property directly
		sigGreatBot.webhookService = mockWebhookService;
		// Create a mock message
		message = createMockMessage('test message', '123456', false);
	});

	it('should not respond to bot messages', async () => {
		// Arrange
		message.author.bot = true;

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should respond to messages matching the pattern', async () => {
		// Arrange
		message.content = 'sig is the best';
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValue({
			userId: '123456',
			avatarUrl: 'https://i.imgur.com/D0czJFu.jpg',
			botName: 'SigGreatBot'
		});

		// Spy on the sendReply method
		const sendReplySpy = jest.spyOn(sigGreatBot, 'sendReply');

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(sendReplySpy).toHaveBeenCalled();
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not respond to messages not matching the pattern', async () => {
		// Arrange
		message.content = 'hello world';

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should update avatar and name from member identity', async () => {
		// Arrange
		message.content = 'siggles is awesome';
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValue({
			userId: '123456',
			avatarUrl: 'https://i.imgur.com/custom-avatar.jpg',
			botName: 'CustomSigBot'
		});

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(getCurrentMemberIdentity).toHaveBeenCalledWith(message.author.id, message.guild);
		expect(sigGreatBot.avatarUrl).toBe('https://i.imgur.com/custom-avatar.jpg');
		expect(sigGreatBot.botName).toBe('CustomSigBot');
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				username: 'CustomSigBot',
				avatarURL: 'https://i.imgur.com/custom-avatar.jpg',
				content: 'SigGreat.'
			})
		);
	});

	it('should use default values if identity is not found', async () => {
		// Arrange
		message.content = 'sig is the best';
		(getCurrentMemberIdentity as jest.Mock).mockResolvedValue(null);

		// Act
		await sigGreatBot.handleMessage(message);

		// Assert
		expect(getCurrentMemberIdentity).toHaveBeenCalledWith(message.author.id, message.guild);
		expect(sigGreatBot.avatarUrl).toBe('https://i.imgur.com/D0czJFu.jpg');
		expect(sigGreatBot.botName).toBe('SigGreatBot');
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});
});
