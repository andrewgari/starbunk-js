import { Client, Message, TextChannel, User } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import { IWebhookService } from '../../../webhooks/webhookService';

// Mock Logger
export class MockLogger implements ILogger {
	debug = jest.fn();
	info = jest.fn();
	warn = jest.fn();
	error = jest.fn();
	fatal = jest.fn();
	success = jest.fn();
}

// Mock WebhookService
export class MockWebhookService implements IWebhookService {
	writeMessage = jest.fn().mockResolvedValue({} as Message<boolean>);
	getChannelWebhook = jest.fn().mockResolvedValue({});
	getWebhook = jest.fn().mockResolvedValue({});
	setWebhook = jest.fn();
	updateWebhook = jest.fn();
	createWebhook = jest.fn();
	deleteWebhook = jest.fn();
	findExistingWebhook = jest.fn();
	getAllWebhooks = jest.fn();
}

// Create a mock Discord message
export function createMockMessage(content: string, authorId: string = '123456789', isBot: boolean = false): Message {
	const mockAuthor = {
		id: authorId,
		bot: isBot,
		username: 'MockUser',
		displayAvatarURL: () => 'https://example.com/avatar.png'
	} as User;

	const mockClient = {
		user: {
			id: '987654321'
		}
	} as Client;

	const mockChannel = {
		id: '111222333',
		send: jest.fn()
	} as unknown as TextChannel;

	return {
		content,
		author: mockAuthor,
		client: mockClient,
		channel: mockChannel,
		createdTimestamp: new Date().getTime(),
		id: '444555666',
		isSelf: jest.fn().mockReturnValue(false)
	} as unknown as Message;
}

// Setup test container with mocks
export function setupTestContainer(): void {
	// Clear the container first
	container.clear();

	// Register mock services
	const mockLogger = new MockLogger();
	const mockWebhookService = new MockWebhookService();

	container.register(ServiceRegistry.LOGGER, mockLogger);
	container.register(ServiceRegistry.WEBHOOK_SERVICE, mockWebhookService);
}

// Setup common bot mocks
export function setupBotMocks(): void {
	// Mock Date.now() if needed
	jest.spyOn(Date, 'now').mockImplementation(() => 1625097600000); // Fixed timestamp
}

// Helper to verify webhook service was called with the right parameters
export function expectWebhookCalledWith(webhookService: MockWebhookService, botName: string, content: string): void {
	expect(webhookService.writeMessage).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			username: botName,
			content
		})
	);
}
