import {
	ChannelType,
	Client,
	ClientEvents,
	Collection,
	Guild,
	GuildMember,
	Message,
	TextChannel,
	User,
	Webhook
} from 'discord.js';

/**
 * A mock Discord client for end-to-end testing of bot functionality
 * Simulates the Discord API and captures bot responses
 */
export class DiscordMock {
	// Mocked Discord.js Client
	client: Client;

	// Mock Discord entities
	guilds: Collection<string, Guild> = new Collection();
	channels: Collection<string, TextChannel> = new Collection();
	users: Collection<string, User> = new Collection();
	webhooks: Collection<string, Webhook> = new Collection();
	messages: Message[] = [];

	// Capture bot responses for verification
	sentMessages: Array<{ channel: string; content: string; username?: string }> = [];

	constructor() {
		// Create mock client with event emitter capabilities
		this.client = {
			user: { id: 'bot123', username: 'TestBot' },
			guilds: this.guilds,
			on: jest.fn(),
			once: jest.fn(),
			emit: jest.fn(),
			login: jest.fn().mockResolvedValue('bot-token'),
		} as unknown as Client;

		// Set up default test guild
		this.setupTestGuild();
	}

	/**
   * Set up a test guild with channels and users
   */
	setupTestGuild(): void {
		// Create mock guild with collections that use direct assignment
		const mockMembers = new Collection<string, GuildMember>();
		const mockChannels = new Collection<string, TextChannel>();

		const guild = {
			id: 'guild123',
			name: 'Test Guild',
			channels: {
				cache: mockChannels,
			},
			members: {
				cache: mockMembers,
			},
		} as unknown as Guild;

		// Create test users
		const user1 = this.createUser('user1', 'TestUser1', false);
		const user2 = this.createUser('user2', 'TestUser2', false);
		const botUser = this.createUser('bot123', 'TestBot', true);

		// Create guild members
		const member1 = this.createGuildMember(guild, user1);
		const member2 = this.createGuildMember(guild, user2);
		const botMember = this.createGuildMember(guild, botUser);

		// Add members to collection
		mockMembers.set(user1.id, member1);
		mockMembers.set(user2.id, member2);
		mockMembers.set(botUser.id, botMember);

		// Create test channels
		const generalChannel = this.createTextChannel('general123', 'general', guild);
		const testChannel = this.createTextChannel('test123', 'test', guild);

		// Add channels to collection
		mockChannels.set(generalChannel.id, generalChannel);
		mockChannels.set(testChannel.id, testChannel);

		// Add to main collections
		this.guilds.set(guild.id, guild);
		this.channels.set(generalChannel.id, generalChannel);
		this.channels.set(testChannel.id, testChannel);
		this.users.set(user1.id, user1);
		this.users.set(user2.id, user2);
		this.users.set(botUser.id, botUser);
	}

	/**
   * Create a mock user
   */
	createUser(id: string, username: string, isBot: boolean): User {
		return {
			id,
			username,
			displayName: username,
			bot: isBot,
			tag: `${username}#1234`,
		} as unknown as User;
	}

	/**
   * Create a mock guild member
   */
	createGuildMember(guild: Guild, user: User): GuildMember {
		return {
			id: user.id,
			user,
			guild,
			displayName: user.username,
		} as unknown as GuildMember;
	}

	/**
   * Create a mock text channel
   */
	createTextChannel(id: string, name: string, guild: Guild): TextChannel {
		const channel = {
			id,
			name,
			guild,
			type: ChannelType.GuildText,
			messages: new Collection(),
			send: jest.fn().mockImplementation((content) => {
				const message = this.createMessage(content, this.client.user as User, channel);
				this.messages.push(message);
				this.sentMessages.push({
					channel: name,
					content: typeof content === 'string' ? content : JSON.stringify(content),
				});
				return Promise.resolve(message);
			}),
			fetchWebhooks: jest.fn().mockResolvedValue([])
		} as unknown as TextChannel;

		return channel;
	}

	/**
   * Create a mock message
   */
	createMessage(content: string, author: User, channel: TextChannel): Message {
		const message = {
			id: `msg_${Date.now()}`,
			content,
			author,
			channel,
			guild: channel.guild,
			createdTimestamp: Date.now(),
			member: channel.guild.members.cache.get(author.id),
			reply: jest.fn().mockImplementation((replyContent) => {
				const replyMessage = this.createMessage(
					typeof replyContent === 'string' ? replyContent : replyContent.content,
					this.client.user as User,
					channel
				);
				this.messages.push(replyMessage);
				this.sentMessages.push({
					channel: channel.name,
					content: typeof replyContent === 'string' ? replyContent : replyContent.content,
				});
				return Promise.resolve(replyMessage);
			}),
		} as unknown as Message;

		return message;
	}

	/**
   * Simulate a user sending a message
   */
	simulateMessage(content: string, username: string = 'TestUser1', channelName: string = 'general'): Promise<Message> {
		const channel = this.channels.find(c => c.name === channelName);
		const user = this.users.find(u => u.username === username) || this.users.get('user1');

		if (!channel) {
			throw new Error(`Channel ${channelName} not found`);
		}

		if (!user) {
			throw new Error(`User ${username} not found`);
		}

		const message = this.createMessage(content, user, channel);
		this.messages.push(message);

		// Use a typed assertion to bypass the type checking issues with messageCreate
		(this.client.emit as jest.Mock).mockImplementation((event, ...args) => {
			return true;
		});

		// Emit the event
		this.client.emit('messageCreate', message);

		return Promise.resolve(message);
	}

	/**
   * Simulate the bot receiving a Discord event
   */
	simulateEvent<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): void {
		(this.client.emit as jest.Mock).mockImplementation((_event, ..._args) => {
			return true;
		});

		this.client.emit(event, ...args);
	}

	/**
   * Mock webhook functionality
   */
	mockWebhookSend(username: string, content: string, channelName: string = 'general'): void {
		const channel = this.channels.find(c => c.name === channelName);

		if (!channel) {
			throw new Error(`Channel ${channelName} not found`);
		}

		this.sentMessages.push({
			channel: channelName,
			content,
			username
		});
	}

	/**
   * Reset all captured data for clean test state
   */
	reset(): void {
		this.sentMessages = [];
		this.messages = [];

		// Reset mock function calls
		jest.clearAllMocks();
	}
}

/**
 * Create a preconfigured Discord mock instance
 */
export function createDiscordMock(): DiscordMock {
	return new DiscordMock();
}
