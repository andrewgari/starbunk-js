import { ChatInputCommandInteraction, Client, Guild, GuildManager, GuildMember, GuildMemberManager, Message, TextChannel, User, VoiceChannel } from 'discord.js';

export const createMockTextChannel = (): jest.Mocked<TextChannel> => {
	const mockWebhook = {
		name: 'MockWebhook',
		send: jest.fn().mockResolvedValue({}),
		id: 'mock-webhook-id'
	};

	const webhooksMap = new Map();
	webhooksMap.set('mock-webhook-id', mockWebhook);

	return {
		send: jest.fn().mockResolvedValue(undefined),
		fetchWebhooks: jest.fn().mockResolvedValue(webhooksMap),
		createWebhook: jest.fn().mockResolvedValue(mockWebhook),
		guild: {
			id: 'mock-guild-id'
		},
		name: 'mock-channel-name',
		id: 'mock-channel-id',
		type: 0
	} as unknown as jest.Mocked<TextChannel>;
};

export const createMockUser = (isBot = false, username = 'mock-user-name'): User => ({
	bot: isBot,
	id: 'mock-user-id',
	username: username,
	discriminator: '1234',
	avatar: 'mock-avatar',
	system: false
} as unknown as User);

export const createMockMessage = (username: string = 'TestUser', content: string = ''): Partial<Message<boolean>> => {
	const member = createMockGuildMember('0', username);
	const mockGuild = createMockGuild();
	const mockChannel = createMockTextChannel();
	const mockClient = createMockClient();

	return {
		content,
		author: member.user,
		guild: mockGuild,
		channel: mockChannel,
		client: mockClient
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

export const createMockVoiceChannel = (): VoiceChannel => ({
	id: 'mock-voice-channel-id',
	guild: {
		id: 'mock-guild-id',
		voiceAdapterCreator: jest.fn()
	},
	join: jest.fn(),
	leave: jest.fn()
} as unknown as VoiceChannel);

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
		tag: `${username}#0000`,
		voice: {
			channel: createMockVoiceChannel(),
			channelId: 'mock-voice-channel-id',
			guild: createMockGuild()
		}
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

export const createMockCommandInteraction = (): ChatInputCommandInteraction => ({
	options: {
		getString: jest.fn().mockReturnValue('https://youtube.com/mock'),
		get: jest.fn().mockReturnValue({ value: 50 })
	},
	reply: jest.fn().mockResolvedValue(undefined),
	deferReply: jest.fn().mockResolvedValue(undefined),
	followUp: jest.fn().mockResolvedValue(undefined),
	member: {
		voice: {
			channel: {
				id: 'mock-voice-channel-id',
				guild: {
					id: 'mock-guild-id',
					voiceAdapterCreator: jest.fn().mockReturnValue({
						sendPayload: jest.fn(),
						destroy: jest.fn()
					})
				}
			}
		}
	} as unknown as GuildMember,
	guild: createMockGuild(),
	client: createMockDiscordClient()
} as unknown as ChatInputCommandInteraction);
