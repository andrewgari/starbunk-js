import { Client, Message, TextChannel, User } from 'discord.js';

export const createMockTextChannel = (): jest.Mocked<TextChannel> => ({
	send: jest.fn().mockResolvedValue(undefined),
	fetchWebhooks: jest.fn().mockResolvedValue([]),
	guild: {
		id: 'mock-guild-id'
	}
} as unknown as jest.Mocked<TextChannel>);

export const createMockUser = (isBot = false): User => ({
	bot: isBot,
	id: 'mock-user-id',
	username: 'mock-user',
	discriminator: '1234',
	avatar: 'mock-avatar',
	system: false
} as unknown as User);

export const createMockMessage = (content = '', isBot = false): Message<boolean> => ({
	author: createMockUser(isBot),
	channel: createMockTextChannel(),
	content
} as unknown as Message<boolean>);

export const createMockClient = (): jest.Mocked<Client> => ({
	user: createMockUser(),
	login: jest.fn().mockResolvedValue(undefined)
} as unknown as jest.Mocked<Client>);
