import { Message, User, Guild, GuildMember, TextChannel, VoiceChannel, Client } from 'discord.js';
import { BotIdentity } from '../types/botIdentity';
import { DiscordService } from '@starbunk/shared';

/**
 * Create a mock Discord message for testing
 * Supports legacy signatures for backward compatibility:
 * - mockMessage() - default message
 * - mockMessage(content) - message with specific content
 * - mockMessage(content, username, isBot) - message with content, username, and bot flag
 * - mockMessage(overrides) - message with property overrides
 */
export function mockMessage(
	contentOrOverrides?: string | Partial<Message>,
	username?: string,
	isBot?: boolean
): Message {
	// Handle legacy signatures
	let overrides: Partial<Message> = {};

	if (typeof contentOrOverrides === 'string') {
		// Legacy signature: mockMessage(content, username?, isBot?)
		overrides.content = contentOrOverrides;
		if (username) {
			overrides.author = {
				...mockUser(),
				username,
				bot: isBot || false
			};
		}
	} else if (contentOrOverrides && typeof contentOrOverrides === 'object') {
		// New signature: mockMessage(overrides)
		overrides = contentOrOverrides;
	}
	// If contentOrOverrides is undefined, use empty overrides (default message)
	const defaultMessage = {
		id: '123456789',
		content: 'test message',
		author: mockUser(),
		channel: mockTextChannel(),
		guild: mockGuild(),
		member: mockGuildMember(),
		client: {
			user: {
				id: 'bot123'
			}
		},
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
			crosspostedChannels: new Map()
		},
		attachments: new Map(),
		embeds: [],
		reactions: {
			cache: new Map()
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
		...overrides
	} as Message;

	return defaultMessage;
}

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
		flags: null,
		premiumType: null,
		publicFlags: null,
		banner: null,
		accentColor: null,
		globalName: 'Test User',
		avatarDecoration: null,
		displayName: 'Test User',
		...overrides
	} as User;

	return defaultUser;
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
			cache: new Map()
		},
		members: {
			cache: new Map()
		},
		channels: {
			cache: new Map()
		},
		roles: {
			cache: new Map()
		},
		...overrides
	} as Guild;

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
			cache: new Map()
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
			suppress: false
		},
		...overrides
	} as GuildMember;

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
			cache: new Map()
		},
		topic: null,
		nsfw: false,
		lastMessageId: null,
		rateLimitPerUser: 0,
		lastPinTimestamp: null,
		defaultAutoArchiveDuration: null,
		...overrides
	} as TextChannel;

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
			cache: new Map()
		},
		bitrate: 64000,
		userLimit: 0,
		rtcRegion: null,
		videoQualityMode: null,
		members: new Map(),
		...overrides
	} as VoiceChannel;

	return defaultChannel;
}

/**
 * Mock BotIdentity for testing
 */
export function mockBotIdentity(overrides: Partial<BotIdentity> = {}): BotIdentity {
	return {
		botName: 'TestBot',
		avatarUrl: 'https://example.com/avatar.png',
		...overrides
	};
}

/**
 * Create a mock DiscordService for testing
 */
export function createMockDiscordService(overrides: Partial<DiscordService> = {}): Partial<DiscordService> {
	return {
		getBotProfile: jest.fn().mockResolvedValue(mockBotIdentity()),
		getMemberAsBotIdentity: jest.fn().mockResolvedValue(mockBotIdentity()),
		getGuild: jest.fn().mockReturnValue(mockGuild()),
		getMember: jest.fn().mockReturnValue(mockGuildMember()),
		getChannel: jest.fn().mockReturnValue(mockTextChannel()),
		getRole: jest.fn().mockReturnValue({}),
		sendMessage: jest.fn().mockResolvedValue(mockMessage()),
		sendBulkMessages: jest.fn().mockResolvedValue([]),
		sendWebhookMessage: jest.fn().mockResolvedValue(mockMessage()),
		sendMessageWithBotIdentity: jest.fn().mockResolvedValue(mockMessage()),
		...overrides
	};
}

/**
 * Global mock instance for DiscordService that can be used across tests
 */
export const mockDiscordService = {
	getBotProfile: jest.fn().mockResolvedValue(mockBotIdentity()),
	getMemberAsBotIdentity: jest.fn().mockResolvedValue(mockBotIdentity()),
	getGuild: jest.fn().mockReturnValue(mockGuild()),
	getMember: jest.fn().mockReturnValue(mockGuildMember()),
	getChannel: jest.fn().mockReturnValue(mockTextChannel()),
	getRole: jest.fn().mockReturnValue({}),
	sendMessage: jest.fn().mockResolvedValue(mockMessage()),
	sendBulkMessages: jest.fn().mockResolvedValue([]),
	sendWebhookMessage: jest.fn().mockResolvedValue(mockMessage()),
	sendMessageWithBotIdentity: jest.fn().mockResolvedValue(mockMessage()),
};

/**
 * Mock Discord Client for testing
 */
export function mockClient(overrides: Partial<Client> = {}): Partial<Client> {
	return {
		user: mockUser({ bot: true }),
		guilds: {
			cache: new Map()
		},
		channels: {
			cache: new Map()
		},
		users: {
			cache: new Map()
		},
		...overrides
	};
}
