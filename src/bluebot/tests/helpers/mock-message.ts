import { Message, User, TextChannel, Guild, GuildMember, Client } from 'discord.js';

/**
 * Additional guild member to include in the mock
 */
export interface AdditionalGuildMember {
	userId: string;
	nickname?: string;
	username?: string;
	isBot?: boolean;
}

/**
 * Default test members that are always present in the mock guild
 * These can be referenced in tests without needing to pass them explicitly
 *
 * Available members:
 * - TestUser (ID: 123456789012345678, nickname: TestNickname)
 * - EnemyUser (ID: 999999999999999999, nickname: EnemyNickname) - commonly used as BLUEBOT_ENEMY_USER_ID
 * - FriendUser (ID: 222222222222222222, nickname: FriendNickname)
 */
export const DEFAULT_TEST_MEMBERS: AdditionalGuildMember[] = [
	{
		userId: '123456789012345678',
		nickname: 'TestNickname',
		username: 'TestUser',
		isBot: false,
	},
	{
		userId: '999999999999999999',
		nickname: 'EnemyNickname',
		username: 'EnemyUser',
		isBot: false,
	},
	{
		userId: '222222222222222222',
		nickname: 'FriendNickname',
		username: 'FriendUser',
		isBot: false,
	},
];

/**
 * Options for creating a mock message
 */
export interface MockMessageOptions {
	content: string;
	authorId?: string;
	isBot?: boolean;
	guildId?: string;
	nickname?: string;
	additionalMembers?: AdditionalGuildMember[];
	/** Message ID this message is replying to */
	replyToMessageId?: string;
	/** Custom timestamp for the message (defaults to Date.now()) */
	timestamp?: number;
}

/**
 * Creates a mock Discord Message for testing with options object
 */
export function createMockMessage(options: MockMessageOptions): Partial<Message> {
	const content = options.content;
	const authorId = options.authorId ?? '111111111111111111';
	const isBot = options.isBot ?? false;
	const guildId = options.guildId ?? '999999999999999999';
	const nickname = options.nickname ?? 'TestNickname';
	const additionalMembers = options.additionalMembers ?? [];
	const replyToMessageId = options.replyToMessageId;
	const timestamp = options.timestamp ?? Date.now();
	const mockUser = {
		id: authorId,
		bot: isBot,
		username: 'TestUser',
	} as Partial<User>;

	const mockGuildMember = {
		id: authorId,
		nickname: nickname,
		user: mockUser as User,
	} as Partial<GuildMember>;

	// Create a map of guild members starting with the message author
	const membersCache = new Map<string, GuildMember>([[authorId, mockGuildMember as GuildMember]]);

	// Merge default test members with any additional members passed in
	// Additional members take precedence over defaults (in case of duplicate IDs)
	const allAdditionalMembers = [
		...DEFAULT_TEST_MEMBERS,
		...additionalMembers,
	];

	// Remove duplicates, keeping the last occurrence (which would be from additionalMembers)
	const uniqueMembers = new Map<string, AdditionalGuildMember>();
	for (const member of allAdditionalMembers) {
		uniqueMembers.set(member.userId, member);
	}

	// Add all unique guild members
	for (const additionalMember of uniqueMembers.values()) {
		const additionalUser = {
			id: additionalMember.userId,
			bot: additionalMember.isBot ?? false,
			username: additionalMember.username ?? 'AdditionalUser',
		} as Partial<User>;

		const additionalGuildMember = {
			id: additionalMember.userId,
			nickname: additionalMember.nickname ?? null,
			user: additionalUser as User,
		} as Partial<GuildMember>;

		membersCache.set(additionalMember.userId, additionalGuildMember as GuildMember);
	}

	// Add Collection-like methods to the members cache
	const membersCollection = Object.assign(membersCache, {
		find: (predicate: (member: GuildMember) => boolean) => {
			for (const member of membersCache.values()) {
				if (predicate(member)) {
					return member;
				}
			}
			return undefined;
		},
	});

	const mockGuild = {
		id: guildId,
		members: {
			cache: membersCollection,
			fetch: async (userId: string) => {
				const member = membersCache.get(userId);
				if (!member) {
					throw new Error(`Member ${userId} not found`);
				}
				return member;
			},
		} as any,
	} as Partial<Guild>;

	const mockClient = {
		guilds: {
			cache: new Map([[guildId, mockGuild as Guild]]),
			fetch: async (id: string) => {
				if (id === guildId) {
					return mockGuild as Guild;
				}
				throw new Error(`Guild ${id} not found`);
			},
		} as any,
	} as Partial<Client>;

	const mockChannel = {
		id: '888888888888888888',
		send: async () => ({} as Message),
		isTextBased: () => true,
		type: 0, // GUILD_TEXT
	} as unknown as Partial<TextChannel>;

	// Make channel an instance of TextChannel for instanceof checks
	Object.setPrototypeOf(mockChannel, TextChannel.prototype);

	const message = {
		content,
		author: mockUser as User,
		guild: mockGuild as Guild,
		channel: mockChannel as TextChannel,
		client: mockClient as Client,
		member: mockGuildMember as GuildMember,
		createdTimestamp: timestamp,
		createdAt: new Date(timestamp),
		attachments: new Map(),
		embeds: [],
	} as Partial<Message>;

	// Add message reference if replying to another message
	if (replyToMessageId) {
		message.reference = {
			messageId: replyToMessageId,
			channelId: mockChannel.id,
			guildId: guildId,
		} as any;
	}

	return message;
}
