import { Client, Guild, Message, TextChannel, User, Webhook } from 'discord.js';
import { ILogger } from '../../../services/Logger';
import container from '../../../services/ServiceContainer';
import { ServiceRegistry } from '../../../services/ServiceRegistry';
import { IWebhookService } from '../../../webhooks/webhookService';

export const mockMessage = (content: string = 'test message', username: string = 'testUser'): Message => {
	const mockUser = {
		bot: false,
		id: 'user123',
		username,
		displayName: username,
	} as User;

	const mockClient = {
		user: {
			id: 'bot123',
		},
	} as Client;

	const mockChannel = {
		id: 'channel123',
		name: 'test-channel',
		fetchWebhooks: jest.fn().mockResolvedValue([]),
	} as unknown as TextChannel;

	const mockGuild = {
		id: 'guild123',
	} as Guild;

	return {
		content,
		author: mockUser,
		client: mockClient,
		channel: mockChannel,
		guild: mockGuild,
		createdTimestamp: Date.now(),
	} as unknown as Message;
};

// Need to use jest.fn() to create proper mock functions
export const mockWriteMessage = jest.fn().mockResolvedValue({} as Message<boolean>);
export const mockGetChannelWebhook = jest.fn().mockResolvedValue({} as Webhook);
export const mockGetWebhook = jest.fn().mockResolvedValue({} as Webhook);

export const mockWebhookService: IWebhookService = {
	writeMessage: mockWriteMessage,
	getChannelWebhook: mockGetChannelWebhook,
	getWebhook: mockGetWebhook,
};

export const mockLogger: ILogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	success: jest.fn(),
};

/**
 * Sets up the service container with mock services for testing
 */
export function setupTestContainer(): void {
	// Clear any existing services
	container.clear();

	// Register mock services
	container.register(ServiceRegistry.LOGGER, mockLogger);
	container.register(ServiceRegistry.WEBHOOK_SERVICE, mockWebhookService);

	// Also update the default webhookService for direct imports
	// Import only when needed to avoid circular dependencies
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const webhookServiceModule = require('../../../webhooks/webhookService');

	// Replace the original functions with mocks
	webhookServiceModule.default.writeMessage = mockWriteMessage;
	webhookServiceModule.default.getChannelWebhook = mockGetChannelWebhook;
	webhookServiceModule.default.getWebhook = mockGetWebhook;
}

/**
 * This workaround is necessary because we can't directly mock the webhook service
 * in a way that Jest understands for type checking
 * @returns A mocked webhookService with jest.fn() implementations
 */
export function getMockedWebhookService(): {
	writeMessage: jest.Mock;
	getChannelWebhook: jest.Mock;
	getWebhook: jest.Mock;
} {
	// Create fresh mock functions for each test
	return {
		writeMessage: jest.fn().mockResolvedValue({}),
		getChannelWebhook: jest.fn().mockResolvedValue({}),
		getWebhook: jest.fn().mockResolvedValue({})
	};
}

/**
 * Setup mocks for testing ReplyBots
 * This function sets up the necessary mocks for webhook service
 */
export function setupBotMocks(): void {
	// Reset all mocks between tests
	jest.resetAllMocks();

	// Import only when needed to avoid circular dependencies
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const webhookServiceModule = require('../../../webhooks/webhookService');

	// Create mock functions
	const mockedService = getMockedWebhookService();

	// Replace the original functions with mocks
	webhookServiceModule.default.writeMessage = mockedService.writeMessage;
	webhookServiceModule.default.getChannelWebhook = mockedService.getChannelWebhook;
	webhookServiceModule.default.getWebhook = mockedService.getWebhook;
}

// Mock the bot constants
jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockImplementation((name) => `${name}Bot`),
	getBotAvatar: jest.fn().mockImplementation((name) => `http://example.com/${name.toLowerCase()}.jpg`),
	getBotPattern: jest.fn().mockImplementation((name) => new RegExp(`\\b${name.toLowerCase()}\\b`, 'i')),
	getBotResponse: jest.fn().mockImplementation((name) => `I am ${name}!`),
}));

// Mock the logger
jest.mock('../../../services/Logger', () => ({
	getLogger: jest.fn().mockReturnValue({
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		success: jest.fn(),
	}),
}));
