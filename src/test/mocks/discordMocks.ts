import { Client, Guild, GuildManager, GuildMemberManager, Message, TextChannel, User } from 'discord.js';

export const createMockTextChannel = (): jest.Mocked<TextChannel> => ({
	send: jest.fn().mockResolvedValue(undefined),
	fetchWebhooks: jest.fn().mockResolvedValue([]),
	guild: {
		id: 'mock-guild-id'
	}
} as unknown as jest.Mocked<TextChannel>);

export const createMockUser = (isBot = false, username = 'mock-user-name'): User => ({
	bot: isBot,
	id: 'mock-user-id',
	username: username,
	discriminator: '1234',
	avatar: 'mock-avatar',
	system: false
} as unknown as User);

export const createMockMessage = (username: string = 'TestUser'): Partial<Message<boolean>> => {
	const member = createMockGuildMember('0', username);
	return {
		content: '',
		author: member.user,
		channel: {
			id: 'mock-channel-id',
			guild: {
				id: 'mock-guild-id'
			} as unknown as Guild,
			type: 0,
			send: jest.fn()
		} as unknown as TextChannel
	} as unknown as Partial<Message<boolean>>;
};

export const createMockClient = (): jest.Mocked<Client> => ({
	user: createMockUser(),
	login: jest.fn().mockResolvedValue(undefined)
} as unknown as jest.Mocked<Client>);

export const mockTextChannel = jest.fn().mockReturnValue({
	send: jest.fn(),
} as unknown as TextChannel);

export const mockMessage = jest.fn().mockImplementation(({ channel }) => ({
	content: '',
	author: { bot: false, username: 'testUser', id: '123' },
	channel,
}) as unknown as Message);

export const createMockGuildMember = (userId: string = '0', username: string = 'TestUser'): { user: User; displayName: string } => ({
	user: {
		id: userId,
		username: username,
		bot: false,
		discriminator: '0000',
		avatar: 'test-avatar',
		system: false,
		displayName: username,
		globalName: username,
		avatarDecorationURL: () => null,
		createDM: () => Promise.resolve(null),
		_equals: () => false,
		accentColor: null,
		avatarDecoration: null,
		avatarDecorationData: null,
		avatarURL: () => 'mock-avatar-url',
		displayAvatarURL: () => 'mock-avatar-url',
		banner: null,
		bannerURL: () => null,
		client: {} as Client,
		createdAt: new Date(),
		createdTimestamp: Date.now(),
		defaultAvatarURL: 'mock-default-avatar',
		dmChannel: null,
		flags: null,
		hexAccentColor: null,
		partial: false,
		tag: `${username}#0000`
	} as unknown as User,
	displayName: username
});

export const createMockGuild = (): Guild => ({
	members: {
		fetch: jest.fn().mockImplementation(async (userId: string) =>
			createMockGuildMember(userId, `user-${userId}`))
	} as unknown as GuildMemberManager
}) as unknown as Guild;

export const createMockDiscordClient = (): Partial<Client> => ({
	guilds: {
		fetch: jest.fn().mockImplementation(async () => createMockGuild())
	} as unknown as GuildManager
});
