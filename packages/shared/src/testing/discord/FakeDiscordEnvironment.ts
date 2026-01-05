import { Message, User, Guild, TextChannel, Collection } from 'discord.js';
import { FakeDiscordClient } from './FakeDiscordClient';
import { MessageCapture, CapturedMessage } from './MessageCapture';

/**
 * Configuration for FakeDiscordEnvironment
 */
export interface FakeDiscordEnvironmentConfig {
	/** Bot user ID */
	botUserId?: string;
	/** Bot username */
	botUsername?: string;
	/** Whether to log messages to console */
	logToConsole?: boolean;
}

/**
 * FakeDiscordEnvironment provides a high-level test harness for simulating Discord
 * Manages fake users, channels, guilds, and message flow
 */
export class FakeDiscordEnvironment {
	public client: FakeDiscordClient;
	public messageCapture: MessageCapture;
	private config: Required<FakeDiscordEnvironmentConfig>;
	private messageIdCounter = 0;

	// Collections for easy access
	private usersByName = new Map<string, User>();
	private channelsByName = new Map<string, TextChannel>();
	private guildsByName = new Map<string, Guild>();

	constructor(config: FakeDiscordEnvironmentConfig = {}) {
		this.config = {
			botUserId: config.botUserId || 'fake-bot-123',
			botUsername: config.botUsername || 'TestBot',
			logToConsole: config.logToConsole ?? true,
		};

		this.client = new FakeDiscordClient();
		this.messageCapture = new MessageCapture();
	}

	/**
	 * Initialize the environment (simulates bot login)
	 */
	async initialize(): Promise<void> {
		await this.client.login('fake-token');

		// Override the bot user with configured values
		if (this.client.user) {
			this.client.user.id = this.config.botUserId;
			this.client.user.username = this.config.botUsername;
		}
	}

	/**
	 * Create a fake user
	 */
	createUser(username: string, userId?: string): User {
		const normalizedUsername = username.toLowerCase();

		if (this.usersByName.has(normalizedUsername)) {
			throw new Error(
				`FakeDiscordEnvironment: User with username "${username}" already exists (case-insensitive).`,
			);
		}

		const id = userId || `user-${normalizedUsername.replace(/\s+/g, '-')}`;
		const user = this.client.createFakeUser(id, username, false);
		this.usersByName.set(normalizedUsername, user);
		return user;
	}

	/**
	 * Create a fake guild (server)
	 */
	createGuild(guildName: string, guildId?: string): Guild {
		const normalizedName = guildName.toLowerCase();

		if (this.guildsByName.has(normalizedName)) {
			throw new Error(
				`FakeDiscordEnvironment: Guild with name '${guildName}' already exists (case-insensitive).`,
			);
		}

		const id = guildId || `guild-${normalizedName.replace(/\s+/g, '-')}`;
		const guild = this.client.createFakeGuild(id, guildName);
		this.guildsByName.set(normalizedName, guild);
		return guild;
	}

	/**
	 * Create a fake text channel
	 */
	createChannel(channelName: string, guild: Guild, channelId?: string): TextChannel {
		const normalizedName = channelName.toLowerCase();

		if (this.channelsByName.has(normalizedName)) {
			throw new Error(
				`A channel with name "${channelName}" already exists in FakeDiscordEnvironment. ` +
					'Channel names must be unique (case-insensitive) across the environment.',
			);
		}

		const id = channelId || `channel-${normalizedName.replace(/\s+/g, '-')}`;
		const channel = this.client.createFakeTextChannel(id, channelName, guild);
		this.channelsByName.set(normalizedName, channel);
		return channel;
	}

	/**
	 * Get user by name
	 */
	getUser(username: string): User | undefined {
		return this.usersByName.get(username.toLowerCase());
	}

	/**
	 * Get channel by name
	 */
	getChannel(channelName: string): TextChannel | undefined {
		return this.channelsByName.get(channelName.toLowerCase());
	}

	/**
	 * Get guild by name
	 */
	getGuild(guildName: string): Guild | undefined {
		return this.guildsByName.get(guildName.toLowerCase());
	}

	/**
	 * Send a user message in a channel
	 * This simulates a user typing a message in Discord
	 */
	async sendUserMessage(username: string, channelName: string, content: string): Promise<Message> {
		const user = this.getUser(username);
		const channel = this.getChannel(channelName);

		if (!user) {
			throw new Error(`User "${username}" not found. Create it first with createUser()`);
		}

		if (!channel) {
			throw new Error(`Channel "${channelName}" not found. Create it first with createChannel()`);
		}

		const message = this.createFakeMessage(user, channel, content);

		// Capture the message
		this.captureMessage(message, message.author.bot);

		// Log to console
		if (this.config.logToConsole) {
			console.log(`[Channel: ${channelName}] User ${username}: ${content}`);
		}

		// Simulate the Discord event
		this.client.simulateMessage(message);

		return message;
	}

	/**
	 * Create a fake message object
	 */
	private createFakeMessage(author: User, channel: TextChannel, content: string): Message {
		const messageId = `msg-${++this.messageIdCounter}`;

		const message = {
			id: messageId,
			content,
			author,
			channel,
			channelId: channel.id,
			guild: channel.guild,
			createdTimestamp: Date.now(),
			mentions: {
				has: (userId: string) => new RegExp(`<@!?${userId}>`).test(content),
				users: new Collection<string, User>(),
			},
			client: this.client,
		} as unknown as Message;

		return message;
	}

	/**
	 * Capture a message for later assertions
	 */
	private captureMessage(message: Message, isBot: boolean): void {
		const captured: CapturedMessage = {
			id: message.id,
			timestamp: message.createdTimestamp,
			channelId: message.channelId,
			channelName: (message.channel as TextChannel).name,
			userId: message.author.id,
			username: message.author.username,
			content: message.content,
			isBot,
			guildId: message.guild?.id,
			guildName: message.guild?.name,
		};

		this.messageCapture.capture(captured);
	}

	/**
	 * Simulate a bot sending a message
	 * This is typically called by webhook.send() in the actual code
	 */
	captureBotMessage(channelName: string, content: string, botName?: string): void {
		const channel = this.getChannel(channelName);
		if (!channel) {
			throw new Error(`Channel "${channelName}" not found`);
		}

		const displayBotName = botName || this.config.botUsername;

		const captured: CapturedMessage = {
			id: `msg-${++this.messageIdCounter}`,
			timestamp: Date.now(),
			channelId: channel.id,
			channelName: channel.name,
			userId: this.config.botUserId,
			username: displayBotName,
			content,
			isBot: true,
			guildId: channel.guild?.id,
			guildName: channel.guild?.name,
		};

		this.messageCapture.capture(captured);

		// Log to console
		if (this.config.logToConsole) {
			console.log(`[Channel: ${channelName}] Bot ${displayBotName}: ${content}`);
		}
	}

	/**
	 * Get all bot responses in a channel
	 */
	getBotResponses(channelName: string): CapturedMessage[] {
		const channel = this.getChannel(channelName);
		if (!channel) {
			return [];
		}
		return this.messageCapture.getBotMessagesInChannel(channel.id);
	}

	/**
	 * Get all user messages in a channel
	 */
	getUserMessages(channelName: string): CapturedMessage[] {
		const channel = this.getChannel(channelName);
		if (!channel) {
			return [];
		}
		return this.messageCapture.getMessagesInChannel(channel.id).filter((msg) => !msg.isBot);
	}

	/**
	 * Clear all captured messages
	 */
	clearMessages(): void {
		this.messageCapture.clear();
	}

	/**
	 * Cleanup the environment
	 */
	async destroy(): Promise<void> {
		await this.client.destroy();
		this.messageCapture.clear();
		this.usersByName.clear();
		this.channelsByName.clear();
		this.guildsByName.clear();
	}
}
