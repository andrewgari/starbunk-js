import { Message, TextChannel, Client, User, GuildMember, Guild, Webhook } from 'discord.js';

/**
 * Mock Discord Message for testing
 */
export class MockDiscordMessage {
	public content: string;
	public author: any;
	public mentions: { has: jest.MockedFunction<(userId: string) => boolean> };
	public guild: any;
	public channel: any;
	public client: any;
	public channelId: string;
	public id: string;

	constructor(
		content: string,
		authorId: string = 'test-user-123',
		isBot: boolean = false,
		guildId?: string,
		channelId: string = 'test-channel-123',
	) {
		this.content = content;
		this.id = `msg-${Date.now()}-${Math.random()}`;
		this.channelId = channelId;

		this.author = {
			id: authorId,
			bot: isBot,
			username: isBot ? 'TestBot' : 'TestUser',
			globalName: isBot ? 'TestBot' : 'Test User',
			displayAvatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatars/123/test.png'),
		};

		this.mentions = {
			has: jest.fn().mockReturnValue(false),
		};

		this.guild = guildId
			? {
					id: guildId,
					name: 'Test Guild',
				}
			: null;

		this.channel = {
			id: channelId,
			name: 'test-channel',
			type: 0, // GUILD_TEXT
			send: jest.fn().mockResolvedValue(undefined),
			fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
			createWebhook: jest.fn().mockResolvedValue(createMockWebhook()),
		};

		this.client = {
			user: {
				id: 'bot-client-123',
				displayAvatarURL: jest.fn().mockReturnValue('https://cdn.discordapp.com/avatars/bot/avatar.png'),
			},
		};
	}

	/**
	 * Set whether this message mentions a specific user
	 */
	setMentions(userId: string, mentioned: boolean = true): void {
		(this.mentions.has as jest.MockedFunction<any>).mockImplementation((id: string) => id === userId && mentioned);
	}
}

/**
 * Mock Discord User
 */
export function createMockUser(
	id: string = 'test-user-123',
	username: string = 'TestUser',
	isBot: boolean = false,
): any {
	return {
		id,
		username,
		bot: isBot,
		globalName: username,
		displayAvatarURL: jest.fn().mockReturnValue(`https://cdn.discordapp.com/avatars/${id}/avatar.png`),
	};
}

/**
 * Mock Discord Guild Member
 */
export function createMockGuildMember(
	userId: string = 'test-user-123',
	nickname?: string,
	guildId: string = 'test-guild-123',
): any {
	const user = createMockUser(userId);

	return {
		id: userId,
		user: user,
		nickname,
		displayName: nickname || user.username || 'TestUser',
		displayAvatarURL: jest
			.fn()
			.mockReturnValue(
				nickname
					? `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/guild-avatar.png`
					: user.displayAvatarURL?.(),
			),
		guild: {
			id: guildId,
			name: 'Test Guild',
		},
	};
}

/**
 * Mock Discord Webhook
 */
export function createMockWebhook(id: string = 'webhook-123'): any {
	return {
		id,
		name: 'Test Webhook',
		send: jest.fn().mockResolvedValue(undefined),
		owner: {
			id: 'bot-client-123',
		},
	};
}

/**
 * Mock Discord Client
 */
export function createMockClient(userId: string = 'bot-client-123'): any {
	return {
		user: createMockUser(userId, 'CovaBot', true),
	};
}

/**
 * Mock Discord Guild
 */
export function createMockGuild(id: string = 'test-guild-123', name: string = 'Test Guild'): any {
	return {
		id,
		name,
		members: {
			fetch: jest.fn().mockResolvedValue(createMockGuildMember()),
		},
	};
}

/**
 * Mock Discord Text Channel
 */
export function createMockTextChannel(id: string = 'test-channel-123', name: string = 'test-channel'): any {
	return {
		id,
		name,
		type: 0, // GUILD_TEXT
		send: jest.fn().mockResolvedValue(undefined),
		fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
		createWebhook: jest.fn().mockResolvedValue(createMockWebhook()),
	};
}

/**
 * Create a mock message that mentions CovaBot
 */
export function createCovaDirectMentionMessage(
	content: string = 'Hey @CovaBot, how are you?',
	authorId: string = 'test-user-123',
): MockDiscordMessage {
	const message = new MockDiscordMessage(content, authorId);
	message.setMentions('bot-client-123', true); // Assuming CovaBot's client ID
	return message;
}

/**
 * Create a mock message that contains "Cova" but isn't a direct mention
 */
export function createCovaNameMentionMessage(
	content: string = 'I wonder what Cova thinks about this',
	authorId: string = 'test-user-123',
): MockDiscordMessage {
	return new MockDiscordMessage(content, authorId);
}

/**
 * Create a mock message from a bot
 */
export function createBotMessage(
	content: string = 'I am a bot message',
	botId: string = 'other-bot-123',
): MockDiscordMessage {
	return new MockDiscordMessage(content, botId, true);
}

/**
 * Create a mock message from CovaBot itself
 */
export function createCovaBotMessage(
	content: string = 'I am CovaBot speaking',
	covaBotId: string = 'bot-client-123',
): MockDiscordMessage {
	return new MockDiscordMessage(content, covaBotId, true);
}
