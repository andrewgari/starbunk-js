import { Message, User, Guild, GuildMember, TextChannel, VoiceChannel, Client, Collection } from 'discord.js';
import { BotIdentity } from '../types/bot-identity';
import { DiscordService } from '../services/discord-service';

/**
 * Mock Discord User for testing
 */
export function mockUser(overrides: Partial<User> = {}): User {
	const defaultUser = {
		id: '987654321',
		username: 'testuser',
		discriminator: '0001',
		avatar: 'avatar_hash',
		bot: false,
		system: false,
		mfaEnabled: false,
		verified: true,
		email: null,
		locale: 'en-US',
		flags: null,
		premiumType: null,
		publicFlags: null,
		banner: null,
		accentColor: null,
		globalName: null,
		avatarDecoration: null,
		displayName: 'testuser',
		...overrides,
	} as unknown as User;

	return defaultUser;
}

/**
 * Mock Discord Client for testing
 */
export function mockClient(overrides: Partial<Client> = {}): Partial<Client> {
	// Provide a minimal default client.user so tests that rely on self-detection work.
	// Cast as any to avoid strict ClientUser type constraints.
	const defaultClient: Partial<Client> = {
		user: mockUser({
			id: '111111111111111111',
			bot: true,
			username: 'BunkBot',
			displayName: 'BunkBot',
		} as unknown as Partial<User>) as any,
	};
	return {
		...defaultClient,
		...overrides,
	};
}

/**
 * Mock Discord Message for testing
 */
export function mockMessage(overrides: any = {}): Message {
	const defaultMessage = {
		id: '123456789',
		content: 'test message',
		author: mockUser(),
		channel: mockTextChannel(),
		guild: mockGuild(),
		member: mockGuildMember(),
		client: mockClient(),
		createdTimestamp: Date.now(),
		editedTimestamp: null,
		mentions: {
			users: new Map(),
			members: new Map(),
			channels: new Map(),
			roles: new Map(),
			everyone: false,
			here: false,
			repliedUser: null,
			crosspostedChannels: new Map(),
		},
		attachments: new Map(),
		embeds: [],
		reactions: {
			cache: new Map(),
		},
		pinned: false,
		tts: false,
		nonce: null,
		system: false,
		flags: null,
		reference: null,
		interaction: null,
		thread: null,
		components: [],
		stickers: new Map(),
		position: null,
		roleSubscriptionData: null,
		resolved: null,
		webhookId: null,
		groupActivityApplication: null,
		applicationId: null,
		activity: null,
		call: null,
		...overrides,
	} as unknown as Message;

	return defaultMessage;
}

/**
 * Mock Discord Guild for testing
 */
export function mockGuild(overrides: Partial<Guild> = {}): Guild {
	const defaultGuild = {
		id: '111222333',
		name: 'Test Guild',
		icon: 'guild_icon_hash',
		features: [],
		commands: {
			cache: new Map(),
		},
		members: {
			cache: new Map(),
		},
		channels: {
			cache: new Map(),
		},
		roles: {
			cache: new Map(),
		},
		...overrides,
	} as unknown as Guild;

	return defaultGuild;
}

/**
 * Mock Discord GuildMember for testing
 */
export function mockGuildMember(overrides: Partial<GuildMember> = {}): GuildMember {
	const defaultMember = {
		id: '987654321',
		user: mockUser(),
		guild: mockGuild(),
		nickname: 'TestNick',
		displayName: 'TestNick',
		joinedTimestamp: Date.now() - 86400000, // 1 day ago
		premiumSinceTimestamp: null,
		roles: {
			cache: new Map(),
		},
		voice: {
			channel: null,
			channelId: null,
			serverDeaf: false,
			serverMute: false,
			selfDeaf: false,
			selfMute: false,
			selfVideo: false,
			sessionId: null,
			streaming: false,
			suppress: false,
		},
		...overrides,
	} as unknown as GuildMember;

	return defaultMember;
}

/**
 * Mock Discord TextChannel for testing
 */
export function mockTextChannel(overrides: Partial<TextChannel> = {}): TextChannel {
	const defaultChannel = {
		id: '444555666',
		name: 'test-channel',
		type: 0, // GUILD_TEXT
		guild: mockGuild(),
		position: 0,
		permissionOverwrites: {
			cache: new Map(),
		},
		topic: null,
		nsfw: false,
		lastMessageId: null,
		rateLimitPerUser: 0,
		lastPinTimestamp: null,
		defaultAutoArchiveDuration: null,
		// Add webhook methods for testing
		createWebhook: jest.fn().mockResolvedValue({
			send: jest.fn().mockResolvedValue(undefined),
		}),
		fetchWebhooks: jest.fn().mockResolvedValue({
			find: jest.fn().mockReturnValue(undefined),
		}),
		send: jest.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as TextChannel;

	// Ensure the mock is recognized as a TextChannel instance
	Object.setPrototypeOf(defaultChannel, TextChannel.prototype);

	return defaultChannel;
}

/**
 * Mock Discord VoiceChannel for testing
 */
export function mockVoiceChannel(overrides: Partial<VoiceChannel> = {}): VoiceChannel {
	const defaultChannel = {
		id: '777888999',
		name: 'test-voice',
		type: 2, // GUILD_VOICE
		guild: mockGuild(),
		position: 0,
		permissionOverwrites: {
			cache: new Map(),
		},
		bitrate: 64000,
		userLimit: 0,
		rtcRegion: null,
		videoQualityMode: null,
		members: new Map(),
		...overrides,
	} as unknown as VoiceChannel;

	return defaultChannel;
}

/**
 * Mock BotIdentity for testing
 */
export function mockBotIdentity(overrides: Partial<BotIdentity> = {}): BotIdentity {
	return {
		botName: 'TestBot',
		avatarUrl: 'https://example.com/avatar.png',
		...overrides,
	};
}

/**
 * Mock DiscordService for testing
 */
export function mockDiscordService(overrides: Partial<DiscordService> = {}): Partial<DiscordService> {
	return {
		getBotProfile: jest.fn().mockResolvedValue(mockBotIdentity()),
		getMemberAsBotIdentity: jest.fn().mockResolvedValue(mockBotIdentity()),
		getGuild: jest.fn().mockReturnValue(mockGuild()),
		getMember: jest.fn().mockReturnValue(mockGuildMember()),
		getMemberAsync: jest.fn().mockResolvedValue(mockGuildMember()),
		sendMessage: jest.fn().mockResolvedValue(mockMessage()),
		sendMessageWithBotIdentity: jest.fn().mockResolvedValue(mockMessage()),
		sendWebhookMessage: jest.fn().mockResolvedValue(mockMessage()),
		...overrides,
	};
}

/**
 * Create a mock CovaBot user for testing bot filtering
 */
export function mockCovaBotUser(overrides: Partial<User> = {}): User {
	return mockUser({
		id: '139592376443338752', // CovaBot's user ID
		username: 'CovaBot',
		displayName: 'CovaBot',
		bot: true,
		...overrides,
	});
}

/**
 * Create a mock message from CovaBot
 */
export function mockCovaBotMessage(overrides: Partial<Message> = {}): Message {
	return mockMessage({
		author: mockCovaBotUser(),
		content: 'Hello from CovaBot!',
		...overrides,
	});
}

/**
 * Create a mock generic bot user for testing
 */
export function mockGenericBotUser(overrides: Partial<User> = {}): User {
	return mockUser({
		id: '123456789012345678',
		username: 'GenericBot',
		displayName: 'GenericBot',
		bot: true,
		...overrides,
	});
}

/**
 * Create a mock message from a generic bot
 */
export function mockGenericBotMessage(overrides: Partial<Message> = {}): Message {
	return mockMessage({
		author: mockGenericBotUser(),
		content: 'Hello from a generic bot!',
		...overrides,
	});
}

/**
 * Create a mock human user for testing
 */
export function mockHumanUser(overrides: Partial<User> = {}): User {
	return mockUser({
		id: '987654321098765432',
		username: 'HumanUser',
		displayName: 'Human User',
		bot: false,
		...overrides,
	});
}

/**
 * Create a mock message from a human user
 */
export function mockHumanMessage(overrides: Partial<Message> = {}): Message {
	return mockMessage({
		author: mockHumanUser(),
		content: 'Hello from a human!',
		...overrides,
	});
}

/**
 * Create a mock testing channel (for debug mode)
 */
export function mockTestingChannel(overrides: Partial<TextChannel> = {}): TextChannel {
	return mockTextChannel({
		id: '123456789012345678', // Testing channel ID
		name: 'testing-channel',
		...overrides,
	});
}

/**
 * Create a mock production channel
 */
export function mockProductionChannel(overrides: Partial<TextChannel> = {}): TextChannel {
	return mockTextChannel({
		id: '987654321098765432', // Production channel ID
		name: 'general',
		...overrides,
	});
}
