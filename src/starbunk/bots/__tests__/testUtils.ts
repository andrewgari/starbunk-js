import { Client, Guild, Message, TextChannel, User } from 'discord.js';

export const mockMessage = (content: string = 'test message', username: string = 'testUser'): Message => {
	const mockUser = {
		bot: false,
		id: 'user123',
		username,
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

export const mockWebhookService = {
	writeMessage: jest.fn().mockResolvedValue({}),
	getChannelWebhook: jest.fn().mockResolvedValue({}),
};

export const mockLogger = {
	debug: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	success: jest.fn(),
};

jest.mock('../botConstants', () => ({
	getBotName: jest.fn().mockReturnValue('EzioBot'),
	getBotAvatar: jest.fn().mockReturnValue('http://example.com/ezio.jpg'),
	getBotPattern: jest.fn().mockReturnValue(/\bezio|h?assassin.*\b/i),
	getBotResponse: jest.fn().mockReturnValue('Requiescat in pace'),
}));

// Mock the logger
jest.mock('../../../services/Logger', () => ({
	getLogger: jest.fn().mockReturnValue({
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	}),
}));
