import { Message, User, TextChannel, Guild, GuildMember, Client } from 'discord.js';

/**
 * Creates a mock Discord Message for testing
 */
export function createMockMessage(
	content: string,
	authorId: string = '123456789012345678',
	isBot: boolean = false,
	guildId: string = '999999999999999999',
	nickname?: string,
): Partial<Message> {
	const mockUser: Partial<User> = {
		id: authorId,
		bot: isBot,
		username: 'TestUser',
		discriminator: '0001',
	};

	const mockGuildMember: Partial<GuildMember> = {
		id: authorId,
		nickname: nickname ?? 'TestNickname',
		user: mockUser as User,
	};

	const mockGuild: Partial<Guild> = {
		id: guildId,
		members: {
			cache: new Map([[authorId, mockGuildMember as GuildMember]]),
		} as any,
	};

	const mockClient: Partial<Client> = {
		guilds: {
			cache: new Map([[guildId, mockGuild as Guild]]),
		} as any,
	};

	const mockChannel: Partial<TextChannel> = {
		id: '888888888888888888',
		send: async () => ({} as Message),
		isTextBased: () => true,
		type: 0, // GUILD_TEXT
	};

	// Make channel an instance of TextChannel for instanceof checks
	Object.setPrototypeOf(mockChannel, TextChannel.prototype);

	return {
		content,
		author: mockUser as User,
		guild: mockGuild as Guild,
		channel: mockChannel as TextChannel,
		client: mockClient as Client,
		member: mockGuildMember as GuildMember,
	} as Partial<Message>;
}

