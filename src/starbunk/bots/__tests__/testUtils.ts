import { Client, Guild, Message, TextChannel, User } from 'discord.js';
import * as bootstrap from '../../../services/bootstrap';
import { Logger, ServiceId, WebhookService } from '../../../services/container';
import { BotIdentity } from '../../../starbunk/types/botIdentity';
import { MessageInfo } from '../../../webhooks/types';

// Create a mock bot identity
export const mockBotIdentity: BotIdentity = {
	botName: 'MockBot',
	avatarUrl: 'https://example.com/avatar.jpg'
};

// Mock WebhookService for test compatibility
export const mockWebhookService = {
	writeMessage: jest.fn().mockResolvedValue(undefined),
	sendMessage: jest.fn().mockResolvedValue(undefined),
	webhookClient: null,
	logger: null as any
};

// Create a mock Discord service implementation with backward compatibility
export const mockDiscordServiceImpl = {
	getMemberAsBotIdentity: jest.fn().mockImplementation(() => mockBotIdentity),
	getRandomMemberAsBotIdentity: jest.fn().mockImplementation(() => mockBotIdentity),
	getBotProfile: jest.fn().mockImplementation(() => mockBotIdentity),
	getRandomBotProfile: jest.fn().mockImplementation(() => mockBotIdentity),
	// This is the key change for backward compatibility:
	// Route DiscordService.sendMessageWithBotIdentity calls to mockWebhookService.writeMessage
	sendMessageWithBotIdentity: jest.fn().mockImplementation((channelId, botIdentity, content) => {
		// Get the channel from the mock message
		const channel = { id: channelId } as any;
		
		// Create a message payload that matches what the webhook service expects
		const messageInfo = {
			botName: botIdentity.botName,
			avatarUrl: botIdentity.avatarUrl,
			content: content
		};
		
		// Call the webhook service's writeMessage method
		return mockWebhookService.writeMessage(channel, messageInfo);
	}),
	getUser: jest.fn(),
	getMember: jest.fn(),
	getGuild: jest.fn(),
	getTextChannel: jest.fn(),
	getVoiceChannel: jest.fn(),
	clearCache: jest.fn()
};

// Mock the getWebhookService function
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService),
	getDiscordService: jest.fn().mockImplementation(() => mockDiscordServiceImpl)
}));

// Mock the DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockImplementation(() => mockDiscordServiceImpl),
		initialize: jest.fn().mockImplementation(() => mockDiscordServiceImpl)
	}
}));

// For backward compatibility
export const mockDiscordService = mockDiscordServiceImpl;

export const mockMessage = (content: string = 'test message', username: string = 'testUser', isBot: boolean = false): Message => {
	const mockUser = {
		bot: isBot,
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
export const mockWriteMessage = jest.fn().mockResolvedValue(undefined);
export const mockSendMessage = jest.fn().mockResolvedValue(undefined);

export const mockLogger: Logger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	success: jest.fn(),
	formatMessage: jest.fn()
};

// Update our mockWebhookService to use the write/send message functions
mockWebhookService.writeMessage = jest.fn().mockImplementation((channel: TextChannel, messageInfo: any) => {
	const transformedMessageInfo: MessageInfo = {
		...messageInfo,
		username: messageInfo.botName || messageInfo.username,
		avatarURL: messageInfo.avatarUrl || messageInfo.avatarURL,
	};
	delete (transformedMessageInfo as any).botName;
	delete (transformedMessageInfo as any).avatarUrl;
	return mockWriteMessage(channel, transformedMessageInfo);
});
mockWebhookService.sendMessage = mockSendMessage;
mockWebhookService.logger = mockLogger;

// For backward compatibility
export const createMockMessage = mockMessage;
export type MockWebhookService = WebhookService;

export function setupTestContainer(): void {
	// This is now handled by the container.clear() and register calls in each test
}

export function setupBotMocks(): void {
	// This is now handled by the container.clear() and register calls in each test
}

export function expectWebhookCalledWith(content: string, username?: string): void {
	expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({
			content,
			...(username && { botName: username }),
		})
	);
}

/**
 * Sets up a bot test with proper mocking of DiscordService and WebhookService
 * @param container The service container
 * @param botIdentity The identity the bot should use (name and avatar URL)
 */
export function setupBotTest(container: any, botIdentity: BotIdentity): void {
	// Clear all mocks
	jest.clearAllMocks();

	// Clear container and register mocks
	container.clear();
	container.register(ServiceId.Logger, () => mockLogger);
	container.register(ServiceId.WebhookService, () => mockWebhookService);

	// Setup mock Discord service
	mockDiscordService.getMemberAsBotIdentity.mockReturnValue(botIdentity);

	// Make sure bootstrap.getWebhookService returns our mock
	(bootstrap.getWebhookService as jest.Mock).mockReturnValue(mockWebhookService);
}

// Reset mock functions before each test
beforeEach(() => {
	jest.clearAllMocks();
});
