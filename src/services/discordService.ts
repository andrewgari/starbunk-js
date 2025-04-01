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
	nonce?: string;
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
		this.retryBotProfileRefresh();

		// Prevent multiple interval setups
		if (this.botProfileRefreshInterval) {
			logger.info('Bot profile refresh interval already set up, skipping');
			return;
		}

		// Set up periodic refresh
		logger.info('Setting up periodic bot profile refresh (every hour)');
		this.botProfileRefreshInterval = setInterval(() => {
			this.retryBotProfileRefresh();
		}, 60 * 60 * 1000); // 1 hour

		// Allow process to exit during tests
		this.botProfileRefreshInterval.unref();
	}

	protected async retryBotProfileRefresh(attempts: number = 3): Promise<void> {
		for (let i = 0; i < attempts; i++) {
			try {
				await this.refreshBotProfiles();
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

	protected async refreshBotProfiles(): Promise<void> {
		try {
			logger.info('[DiscordService] Starting bot profile refresh');
			const guild = await this.getGuild(DefaultGuildId);
			logger.debug(`[DiscordService] Using guild: ${guild.name} (${guild.id})`);

			// Log current cache state
			logger.debug(`[DiscordService] Current cache state - Members: ${this.memberCache.size}, Bot Profiles: ${this.botProfileCache.size}`);

			// Create a temporary cache for the new fetch
			const tempCache = new Map<string, GuildMember>();
			const tempBotCache = new Map<string, BotIdentity>();

			// Get the current members from cache first as backup
			const previousCache = new Map(this.memberCache);
			const previousBotCache = new Map(this.botProfileCache);
			logger.debug(`[DiscordService] Backup cache created - Members: ${previousCache.size}, Bot Profiles: ${previousBotCache.size}`);

			try {
				let lastId: string | undefined;
				let totalMembers = 0;
				let attemptCount = 0;
				const chunkSize = 50;

				while (true) {
					attemptCount++;
					try {
						const fetchOptions: MemberFetchOptions = {
							time: 180000, // 3 minutes timeout
							limit: chunkSize,
							withPresences: false // Don't fetch presence data to reduce payload
						};

						if (lastId) {
							// @ts-expect-error Discord.js types don't include after option but it's supported
							fetchOptions.after = lastId;
						}

						logger.debug(`[DiscordService] Fetching chunk ${attemptCount} (after: ${lastId || 'initial'})`);
						const members = await guild.members.fetch(fetchOptions);

						if (members.size === 0) {
							logger.debug('[DiscordService] No more members to fetch');
							break;
						}

						// Add to temporary cache
						let validMembers = 0;
						let invalidMembers = 0;
						members.forEach(member => {
							try {
								const cacheKey = `${guild.id}:${member.id}`;
								tempCache.set(cacheKey, member);

								// Also cache bot identity
								const avatarUrl = member.displayAvatarURL({ extension: 'png', size: 128 });
								if (!member.displayName || !avatarUrl) {
									logger.warn(`[DiscordService] Invalid member data - ID: ${member.id}, DisplayName: ${member.displayName || 'missing'}, AvatarUrl: ${avatarUrl || 'missing'}`);
									invalidMembers++;
									return;
								}

								tempBotCache.set(member.id, {
									botName: member.displayName,
									avatarUrl
								});
								validMembers++;
							} catch (memberError) {
								logger.error(`[DiscordService] Failed to process member ${member.id}: ${memberError instanceof Error ? memberError.message : String(memberError)}`);
								invalidMembers++;
							}
						});

						totalMembers += members.size;
						lastId = members.last()?.id;

						// Log detailed progress
						logger.debug(`[DiscordService] Chunk ${attemptCount} complete - Size: ${members.size}, Valid: ${validMembers}, Invalid: ${invalidMembers}, Total so far: ${totalMembers}`);

						if (members.size < chunkSize) {
							logger.debug('[DiscordService] Received less than chunk size, finishing fetch');
							break;
						}

						// Prevent rate limiting
						await new Promise(resolve => setTimeout(resolve, 1000));
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						logger.warn(`[DiscordService] Chunk ${attemptCount} fetch failed: ${errorMessage}`);
						logger.warn('[DiscordService] Using previous cache state due to chunk failure');

						// Log cache states for debugging
						logger.debug(`[DiscordService] Failed temp cache state - Members: ${tempCache.size}, Bot Profiles: ${tempBotCache.size}`);
						logger.debug(`[DiscordService] Reverting to previous cache - Members: ${previousCache.size}, Bot Profiles: ${previousBotCache.size}`);

						this.memberCache = new Map(previousCache);
						this.botProfileCache = new Map(previousBotCache);
						return;
					}
				}

				// Only update the main cache if we successfully fetched all members
				if (totalMembers > 0) {
					this.memberCache = tempCache;
					this.botProfileCache = tempBotCache;
					logger.info(`[DiscordService] Cache refresh complete - Cached ${totalMembers} members and bot profiles`);
					logger.debug(`[DiscordService] New cache state - Members: ${this.memberCache.size}, Bot Profiles: ${this.botProfileCache.size}`);
				} else {
					logger.warn('[DiscordService] No members fetched, keeping previous cache');
					logger.debug(`[DiscordService] Retained cache state - Members: ${previousCache.size}, Bot Profiles: ${previousBotCache.size}`);
					this.memberCache = new Map(previousCache);
					this.botProfileCache = new Map(previousBotCache);
				}
			} catch (error) {
				// If fetch fails, restore previous cache
				this.memberCache = new Map(previousCache);
				this.botProfileCache = new Map(previousBotCache);
				logger.error('[DiscordService] Member fetch failed completely, restored previous cache:',
					error instanceof Error ? error : new Error(String(error))
				);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.stack : String(error);
			logger.error(`[DiscordService] Critical failure in bot profile refresh: ${errorMessage}`);
			throw new DiscordServiceError(`Failed to refresh bot profiles: ${errorMessage}`);
		}
	}

	public async getBotProfile(userId: string, forceRefresh: boolean = false): Promise<BotIdentity> {
		try {
			const profile = this.botProfileCache.get(userId);
			if (!profile || !profile.botName || !profile.avatarUrl || forceRefresh) {
				// Fallback to direct fetch if not in cache or invalid cache entry
				logger.debug(`[DiscordService] Bot profile for ${userId} not in cache or refresh requested, fetching directly`);
				return await this.getMemberAsBotIdentity(userId, forceRefresh);
			}
			return profile;
		} catch (error) {
			logger.error(`[DiscordService] Failed to get bot profile for ${userId}: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
	}

	public async getRandomBotProfile(): Promise<BotIdentity> {
		try {
			const profiles = Array.from(this.botProfileCache.values())
				.filter(profile => profile.botName && profile.avatarUrl); // Only consider valid profiles

			if (profiles.length === 0) {
				// Fallback to getting a random member's identity if cache is empty
				logger.debug('[DiscordService] No valid bot profiles in cache, fetching random member');
				return await this.getRandomMemberAsBotIdentity();
			}

			const randomIndex = Math.floor(Math.random() * profiles.length);
			return profiles[randomIndex];
		} catch (error) {
			logger.error(`[DiscordService] Failed to get random bot profile: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
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
		if (!botIdentity || !botIdentity.botName || !botIdentity.avatarUrl) {
			logger.error(`[DiscordService] Invalid bot identity provided for message to channel ${channelId}`);
			return; // Skip sending the message with invalid identity
		}

		try {
			const channel = this.getTextChannel(channelId);
			const webhook = await this.getOrCreateWebhook(channel);
			await webhook.send({
				content: message,
				username: botIdentity.botName,
				avatarURL: botIdentity.avatarUrl
			});
			logger.debug(`[DiscordService] Message sent to channel ${channelId} via webhook as ${botIdentity.botName}`);
		} catch (error) {
			logger.error(`[DiscordService] Failed to send message with bot identity to channel ${channelId}: ${error instanceof Error ? error.message : String(error)}`);
			// Intentionally not attempting fallback to protect identity
		}
	}

	/**
	 * Wrapper method for the WebhookService to ensure all webhook communication goes through DiscordService
	 * @param channel Text channel to send the message to
	 * @param messageInfo Message information including content, username, and avatar URL
	 */
	public async sendWebhookMessage(channel: TextChannel, messageInfo: any): Promise<void> {
		// Ensure the WebhookService module is loaded via require to avoid circular dependencies
		const { getWebhookService } = require('./bootstrap');
		const webhookService = getWebhookService();

		// Validate identity information before sending
		if (!messageInfo.username && !messageInfo.botName) {
			logger.error('[DiscordService] Missing username/botName in webhook message');
			return;
		}

		if (!messageInfo.avatarURL && !messageInfo.avatarUrl) {
			logger.error('[DiscordService] Missing avatarURL/avatarUrl in webhook message');
			return;
		}

		try {
			await webhookService.writeMessage(channel, messageInfo);
			logger.debug(`[DiscordService] Webhook message sent to channel ${channel.name}`);
		} catch (error) {
			logger.error(`[DiscordService] Failed to send webhook message: ${error instanceof Error ? error.message : String(error)}`);
		}
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

	public async getMemberAsBotIdentity(userId: string, forceRefresh: boolean = false): Promise<BotIdentity> {
		try {
			// First check if we have a cached bot profile
			const cachedProfile = this.botProfileCache.get(userId);
			if (cachedProfile && !forceRefresh) {
				// Validate the cached profile
				if (cachedProfile.botName && cachedProfile.avatarUrl) {
					return cachedProfile;
				} else {
					logger.warn(`[DiscordService] Found invalid cached profile for user ${userId}, forcing refresh`);
					// Invalid cache entry, continue to force refresh
				}
			}

			// If we need to refresh or don't have a cached profile
			let member: GuildMember;
			try {
				if (forceRefresh) {
					// Fetch directly from API to bypass all caches
					const guild = this.getGuild(DefaultGuildId);
					member = await guild.members.fetch({ user: userId, force: true });

					// Update our cache with this fresh data
					const cacheKey = `${DefaultGuildId}:${userId}`;
					this.memberCache.set(cacheKey, member);

					logger.debug(`[DiscordService] Forced refresh of member ${userId} successful`);
				} else {
					// Use normal getMember which uses cache with fallback to fetch
					member = this.getMember(DefaultGuildId, userId);
				}
			} catch (memberError) {
				logger.error(`[DiscordService] Failed to get member ${userId}: ${memberError instanceof Error ? memberError.message : String(memberError)}`);
				throw memberError;
			}

			// Validate data before creating identity
			if (!member || !member.user) {
				throw new Error(`Invalid member data for user ${userId}`);
			}

			// Ensure we have valid display name
			const botName = member.nickname ?? member.user.username;
			if (!botName) {
				throw new Error(`No valid display name found for user ${userId}`);
			}

			// Ensure we have valid avatar URL
			const avatarUrl = member.displayAvatarURL() ?? member.user.displayAvatarURL();
			if (!avatarUrl) {
				throw new Error(`No valid avatar URL found for user ${userId}`);
			}

			// Create and cache the bot identity
			const identity: BotIdentity = { botName, avatarUrl };
			this.botProfileCache.set(userId, identity);

			return identity;
		} catch (error) {
			logger.error(`[DiscordService] Failed to get bot identity for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
	}

	public async getRandomMemberAsBotIdentity(): Promise<BotIdentity> {
		try {
			const member = this.getRandomMember();

			// Validate data before creating identity
			if (!member || !member.user) {
				throw new Error('Invalid random member data');
			}

			// Ensure we have valid display name
			const botName = member.nickname ?? member.user.username;
			if (!botName) {
				throw new Error(`No valid display name found for random member ${member.id}`);
			}

			// Ensure we have valid avatar URL
			const avatarUrl = member.displayAvatarURL() ?? member.user.displayAvatarURL();
			if (!avatarUrl) {
				throw new Error(`No valid avatar URL found for random member ${member.id}`);
			}

			return { botName, avatarUrl };
		} catch (error) {
			logger.error(`[DiscordService] Failed to get random bot identity: ${error instanceof Error ? error.message : String(error)}`);
			throw error;
		}
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
