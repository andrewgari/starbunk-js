import { Client, Guild, Message, TextChannel, User } from 'discord.js';
import * as bootstrap from '../../../services/bootstrap';
import { Logger, ServiceId, WebhookService } from '../../../services/container';
import { BotIdentity } from '../../../starbunk/types/botIdentity';

// Mock the getWebhookService function
jest.mock('../../../services/bootstrap', () => ({
	getWebhookService: jest.fn().mockImplementation(() => mockWebhookService)
}));

// Mock the DiscordService
jest.mock('../../../services/discordService', () => {
	return {
		DiscordService: {
			getInstance: jest.fn().mockImplementation(() => mockDiscordService),
			initialize: jest.fn().mockImplementation(() => mockDiscordService)
		}
	};
});

// Create a mock bot identity
export const mockBotIdentity: BotIdentity = {
	botName: 'MockBot',
	avatarUrl: 'https://example.com/avatar.jpg'
};

// Create a mock DiscordService
export const mockDiscordService = {
	getMemberAsBotIdentity: jest.fn().mockImplementation(() => mockBotIdentity),
	getRandomMemberAsBotIdentity: jest.fn().mockImplementation(() => mockBotIdentity),
	sendMessageWithBotIdentity: jest.fn(),
	getUser: jest.fn(),
	getMember: jest.fn(),
	getGuild: jest.fn(),
	getTextChannel: jest.fn(),
	getVoiceChannel: jest.fn(),
	clearCache: jest.fn()
};

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

export const mockWebhookService: WebhookService = {
	writeMessage: mockWriteMessage,
	sendMessage: mockSendMessage,
	webhookClient: null,
	logger: mockLogger
};

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
			...(username && { username }),
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
