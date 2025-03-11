import { Client, Guild, Message, TextChannel, User } from 'discord.js';
import { Logger, WebhookService } from '../../../services/services';

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
export const mockWriteMessage = jest.fn().mockResolvedValue({} as Message<boolean>);
export const mockSendMessage = jest.fn().mockResolvedValue({} as Message<boolean>);

export const mockWebhookService: WebhookService = {
	writeMessage: mockWriteMessage,
	sendMessage: mockSendMessage,
	webhookClient: null,
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		success: jest.fn(),
		formatMessage: jest.fn(),
		getCallerInfo: jest.fn()
	},
};

export const mockLogger: Logger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	success: jest.fn(),
	formatMessage: jest.fn(),
	getCallerInfo: jest.fn()
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

// Reset mock functions before each test
beforeEach(() => {
	jest.clearAllMocks();
});
