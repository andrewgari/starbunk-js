import { Client, Guild, Message, MessageReaction, Role, TextChannel, User, VoiceChannel, Webhook } from "discord.js";

import { BotIdentity } from "@/starbunk/types/botIdentity";
import { GuildMember } from "discord.js";
import guildIds from '../discord/guildIds';
import {
	ChannelNotFoundError,
	DiscordServiceError,
	GuildNotFoundError,
	MemberNotFoundError,
	MessageNotFoundError,
	RoleNotFoundError,
	UserNotFoundError,
	WebhookError
} from "./errors/discordErrors";
import { logger } from './logger';

export interface BulkMessageOptions {
	channelIds: string[];
	message: string;
	botIdentity?: BotIdentity;
}

export interface MemberFetchOptions {
	time?: number;
	limit?: number;
	withPresences?: boolean;
}

/**
 * Interface for accessing protected methods in tests
 * This allows the tests to access protected methods without changing their visibility
 */
export interface ProtectedMethods {
	refreshBotProfiles: () => Promise<void>;
	retryBotProfileRefresh: (attempts?: number) => Promise<void>;
}

// Singleton instance
let discordServiceInstance: DiscordService | null = null;
const DefaultGuildId = guildIds.StarbunkCrusaders;

export class DiscordService {
	private memberCache = new Map<string, GuildMember>();
	private channelCache = new Map<string, TextChannel | VoiceChannel>();
	private guildCache = new Map<string, Guild>();
	private roleCache = new Map<string, Role>();
	private botProfileCache = new Map<string, BotIdentity>();
	private webhookCache = new Map<string, Webhook>();
	private botProfileRefreshInterval: NodeJS.Timeout | null = null;

	protected constructor(private readonly client: Client) {
		// Wait for ready event before starting bot profile refresh
		this.client.once('ready', () => {
			this.startBotProfileRefresh();
		});
	}

	private async getOrCreateWebhook(channel: TextChannel): Promise<Webhook> {
		const cacheKey = channel.id;
		const cachedWebhook = this.webhookCache.get(cacheKey);
		if (cachedWebhook) {
			return cachedWebhook;
		}

		try {
			// Try to find existing webhook
			const webhooks = await channel.fetchWebhooks();
			const existingWebhook = webhooks.find(w => w.owner?.id === this.client.user?.id);
			if (existingWebhook) {
				this.webhookCache.set(cacheKey, existingWebhook);
				return existingWebhook;
			}

			// Create new webhook if none exists
			if (!this.client.user) {
				throw new WebhookError('Client user not available');
			}

			const newWebhook = await channel.createWebhook({
				name: 'Starbunk Bot',
				avatar: this.client.user.displayAvatarURL()
			});
			this.webhookCache.set(cacheKey, newWebhook);
			return newWebhook;
		} catch (error) {
			throw new WebhookError(`Failed to create webhook: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private startBotProfileRefresh(): void {
		// Initial refresh with retry
		this._test_retryBotProfileRefresh();

		// Prevent multiple interval setups
		if (this.botProfileRefreshInterval) {
			logger.info('Bot profile refresh interval already set up, skipping');
			return;
		}

		// Set up periodic refresh
		logger.info('Setting up periodic bot profile refresh (every hour)');
		this.botProfileRefreshInterval = setInterval(() => {
			this._test_retryBotProfileRefresh();
		}, 60 * 60 * 1000); // 1 hour
		
		// Allow process to exit during tests
		this.botProfileRefreshInterval.unref();
	}

	// For testing purposes - public method with a test prefix
	public async _test_retryBotProfileRefresh(attempts: number = 3): Promise<void> {
		for (let i = 0; i < attempts; i++) {
			try {
				await this._test_refreshBotProfiles();
				return;
			} catch (error) {
				if (i === attempts - 1) {
					logger.error('All retry attempts failed for bot profile refresh:',
						error instanceof Error ? error : new Error(String(error))
					);
				} else {
					logger.warn(`Retry attempt ${i + 1} failed, retrying in 5 seconds...`);
					await new Promise(resolve => setTimeout(resolve, 5000));
				}
			}
		}
	}

	// For testing purposes - public method with a test prefix
	public async _test_refreshBotProfiles(): Promise<void> {
		try {
			const guild = await this.getGuild(DefaultGuildId);

			// Clear the cache before starting
			this.memberCache.clear();

			// Get the current members from cache first
			guild.members.cache.forEach(member => {
				const cacheKey = `${guild.id}:${member.id}`;
				this.memberCache.set(cacheKey, member);
			});

			try {
				// Use REST-based fetch with chunking enabled
				const fetchOptions: MemberFetchOptions = {
					time: 120000, // 2 minutes timeout
					limit: 100, // Fetch in chunks of 100
					withPresences: false // Don't fetch presence data to reduce payload
				};

				await guild.members.fetch(fetchOptions);

				// Update cache with fetched members
				const memberCount = guild.members.cache.size;
				guild.members.cache.forEach(member => {
					const cacheKey = `${guild.id}:${member.id}`;
					this.memberCache.set(cacheKey, member);
				});

				logger.info(`Successfully cached ${memberCount} members`);
			} catch (error) {
				// If fetch fails, log but continue with cached members
				logger.warn('Member fetch failed, continuing with cached members:',
					error instanceof Error ? error : new Error(String(error))
				);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new DiscordServiceError(`Failed to refresh bot profiles: ${errorMessage}`);
		}
	}

	public getBotProfile(userId: string): BotIdentity {
		const profile = this.botProfileCache.get(userId);
		if (!profile) {
			// Fallback to direct fetch if not in cache
			return this.getMemberAsBotIdentity(userId);
		}
		return profile;
	}

	public getRandomBotProfile(): BotIdentity {
		const profiles = Array.from(this.botProfileCache.values());
		if (profiles.length === 0) {
			// Fallback to getting a random member's identity if cache is empty
			return this.getRandomMemberAsBotIdentity();
		}
		const randomIndex = Math.floor(Math.random() * profiles.length);
		return profiles[randomIndex];
	}

	/**
	 * Initialize the Discord service singleton
	 * @param client Discord.js client
	 * @returns The DiscordService instance
	 * @throws DiscordServiceError if already initialized
	 */
	public static initialize(client: Client): DiscordService {
		if (discordServiceInstance) {
			throw new DiscordServiceError('DiscordService is already initialized');
		}
		discordServiceInstance = new DiscordService(client);
		return discordServiceInstance;
	}

	/**
	 * Get the Discord service instance. Must call initialize first.
	 * @returns The DiscordService instance
	 * @throws DiscordServiceError if not initialized
	 */
	public static getInstance(): DiscordService {
		if (!discordServiceInstance) {
			throw new DiscordServiceError('DiscordService not initialized. Call initialize() first.');
		}
		return discordServiceInstance;
	}
	
	// Methods with _test_ prefix are test-only public implementations of protected methods

	// Clear all caches
	public clearCache(): void {
		this.memberCache.clear();
		this.channelCache.clear();
		this.guildCache.clear();
		this.roleCache.clear();
		this.webhookCache.clear();
	}

	public sendMessage(channelId: string, message: string): Promise<Message> {
		const channel = this.getTextChannel(channelId);
		return channel.send(message);
	}

	public async sendMessageWithBotIdentity(channelId: string, botIdentity: BotIdentity, message: string): Promise<void> {
		const channel = this.getTextChannel(channelId);
		const webhook = await this.getOrCreateWebhook(channel);
		await webhook.send({
			content: message,
			username: botIdentity.botName,
			avatarURL: botIdentity.avatarUrl
		});
	}

	public async sendBulkMessages(options: BulkMessageOptions): Promise<Message[]> {
		const results: Message[] = [];
		const errors: Error[] = [];

		await Promise.all(options.channelIds.map(async channelId => {
			try {
				if (options.botIdentity) {
					await this.sendMessageWithBotIdentity(channelId, options.botIdentity, options.message);
				} else {
					const message = await this.sendMessage(channelId, options.message);
					results.push(message);
				}
			} catch (error) {
				const errorMessage = `Failed to send message to channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`;
				errors.push(new DiscordServiceError(errorMessage));
				logger.error(errorMessage);
			}
		}));

		if (errors.length > 0) {
			logger.warn(`Failed to send messages to ${errors.length} channels`);
		}

		return results;
	}

	public getUser(userId: string): User {
		const user = this.client.users.cache.get(userId);
		if (!user) {
			throw new UserNotFoundError(userId);
		}
		return user;
	}

	public getMember(guildId: string, memberId: string): GuildMember {
		const cacheKey = `${guildId}:${memberId}`;

		const cachedMember = this.memberCache.get(cacheKey);
		if (cachedMember) {
			return cachedMember;
		}

		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) {
			throw new GuildNotFoundError(guildId);
		}

		const member = guild.members.cache.get(memberId);
		if (!member) {
			throw new MemberNotFoundError(memberId);
		}

		// Cache the result
		this.memberCache.set(cacheKey, member);
		return member;
	}

	public getMemberByUsername(guildId: string, username: string): GuildMember {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) {
			throw new GuildNotFoundError(guildId);
		}

		const member = guild.members.cache.find(m => m.user.username === username);
		if (!member) {
			throw new MemberNotFoundError(`username: ${username}`);
		}
		return member;
	}

	public getRandomMember(guildId: string = DefaultGuildId): GuildMember {
		const members = this.getMembersWithRole(guildId, "member");
		if (members.length === 0) {
			throw new DiscordServiceError("No members found with the specified role");
		}
		const randomIndex = Math.floor(Math.random() * members.length);
		return members[randomIndex];
	}

	public getMemberAsBotIdentity(userId: string): BotIdentity {
		const member = this.getMember(DefaultGuildId, userId);
		return {
			botName: member.nickname ?? member.user.username,
			avatarUrl: member.displayAvatarURL() ?? member.user.displayAvatarURL()
		};
	}

	public getRandomMemberAsBotIdentity(): BotIdentity {
		const member = this.getRandomMember();
		return {
			botName: member.nickname ?? member.user.username,
			avatarUrl: member.displayAvatarURL() ?? member.user.displayAvatarURL()
		};
	}

	public getTextChannel(channelId: string): TextChannel {
		const cachedChannel = this.channelCache.get(channelId);
		if (cachedChannel instanceof TextChannel) {
			return cachedChannel;
		}

		const channel = this.client.channels.cache.get(channelId);
		if (!channel) {
			throw new ChannelNotFoundError(channelId);
		}

		if (!(channel instanceof TextChannel)) {
			throw new DiscordServiceError(`Channel ${channelId} is not a text channel`);
		}

		this.channelCache.set(channelId, channel);
		return channel;
	}

	public getVoiceChannel(channelId: string): VoiceChannel {
		const cachedChannel = this.channelCache.get(channelId);
		if (cachedChannel instanceof VoiceChannel) {
			return cachedChannel;
		}

		const channel = this.client.channels.cache.get(channelId);
		if (!channel) {
			throw new ChannelNotFoundError(channelId);
		}

		if (!(channel instanceof VoiceChannel)) {
			throw new DiscordServiceError(`Channel ${channelId} is not a voice channel`);
		}

		this.channelCache.set(channelId, channel);
		return channel;
	}

	public getVoiceChannelFromMessage(message: Message): VoiceChannel {
		return this.getVoiceChannel(message.channel.id);
	}

	public getGuild(guildId: string): Guild {
		const cachedGuild = this.guildCache.get(guildId);
		if (cachedGuild) {
			return cachedGuild;
		}

		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) {
			throw new GuildNotFoundError(guildId);
		}

		this.guildCache.set(guildId, guild);
		return guild;
	}

	public getRole(guildId: string, roleId: string): Role {
		const cacheKey = `${guildId}:${roleId}`;
		const cachedRole = this.roleCache.get(cacheKey);
		if (cachedRole) {
			return cachedRole;
		}

		const guild = this.getGuild(guildId);
		const role = guild.roles.cache.get(roleId);
		if (!role) {
			throw new RoleNotFoundError(roleId);
		}

		this.roleCache.set(cacheKey, role);
		return role;
	}

	public getMembersWithRole(guildId: string, roleId: string): GuildMember[] {
		const guild = this.getGuild(guildId);
		const role = this.getRole(guildId, roleId);

		return Array.from(guild.members.cache.values())
			.filter(member => member.roles.cache.has(role.id))
			.map(member => member as GuildMember);
	}

	public addReaction(messageId: string, channelId: string, emoji: string): Promise<MessageReaction> {
		const channel = this.getTextChannel(channelId);
		const message = channel.messages.cache.get(messageId);
		if (!message) {
			throw new MessageNotFoundError(messageId, channelId);
		}
		return message.react(emoji);
	}

	public async removeReaction(messageId: string, channelId: string, emoji: string): Promise<void> {
		const channel = this.getTextChannel(channelId);
		const message = channel.messages.cache.get(messageId);
		if (!message) {
			throw new MessageNotFoundError(messageId, channelId);
		}

		const userReactions = message.reactions.cache.get(emoji);
		if (userReactions && this.client.user) {
			await userReactions.users.remove(this.client.user.id);
		}
	}

	public isBotMessage(message: Message): boolean {
		return message.author.bot && message.author.id === this.client.user?.id;
	}

	// Cleanup on service shutdown
	public cleanup(): void {
		if (this.botProfileRefreshInterval) {
			clearInterval(this.botProfileRefreshInterval);
			this.botProfileRefreshInterval = null;
		}
		this.clearCache();
	}
}