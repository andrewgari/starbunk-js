import {
	APIEmbed,
	Client,
	GatewayIntentBits,
	Guild,
	GuildMember,
	Message,
	PartialGuildMember,
	Role,
	TextChannel,
	User,
	VoiceChannel,
	Webhook,
} from 'discord.js';
import schedule from 'node-schedule';

import { BotIdentity } from '../types/bot-identity';
import {
	ChannelNotFoundError,
	DiscordServiceError,
	GuildNotFoundError,
	MemberNotFoundError,
	UserNotFoundError,
	WebhookError,
} from './errors/discord-errors';
import { logger, ensureError } from '@starbunk/shared';

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

export interface WebhookMessageInfo {
	content: string;
	username?: string;
	botName?: string;
	avatarURL?: string;
	avatarUrl?: string;
	embeds?: APIEmbed[];
}

/**
 * Interface for accessing protected methods in tests
 * This allows the tests to access protected methods without changing their visibility
 */
export interface ProtectedMethods {
	refreshBotProfiles: () => Promise<void>;
	retryBotProfileRefresh: (attempts?: number) => Promise<void>;
}

// Default Guild ID from environment variable (fallback to Starbunk Crusaders)
const DefaultGuildId = process.env.GUILD_ID || '753251582719688714';

export class DiscordService {
	private memberCache = new Map<string, GuildMember>();
	private channelCache = new Map<string, TextChannel | VoiceChannel>();
	private guildCache = new Map<string, Guild>();
	private roleCache = new Map<string, Role>();
	private botProfileCache = new Map<string, BotIdentity>();
	private webhookCache = new Map<string, Webhook>();
	private botProfileRefreshJob: schedule.Job | null = null;
	private lastFetchTimestamp: number = 0;
	private readonly FETCH_COOLDOWN = 5000; // 5 seconds cooldown between fetches

	constructor(private readonly client: Client) {
		// Verify we have the right intents and caching setup
		if (!client.options.intents.has(GatewayIntentBits.GuildMembers)) {
			throw new Error('[DiscordService] GuildMembers intent is required for member fetching');
		}

		if (!client.options.intents.has(GatewayIntentBits.Guilds)) {
			throw new Error('[DiscordService] Guilds intent is required for basic functionality');
		}

		// Setup event listeners
		this.client.once('ready', () => {
			this.setupGuildCaching();
			this.startBotProfileRefresh();
		});

		// Listen for member updates to keep cache fresh
		this.client.on('guildMemberUpdate', (oldMember, newMember) => {
			this.handleMemberUpdate(oldMember, newMember);
		});

		this.client.on('guildMemberAdd', (member) => {
			this.handleMemberAdd(member);
		});

		this.client.on('guildMemberRemove', (member) => {
			this.handleMemberRemove(member);
		});

		// Handle rate limit warnings
		this.client.rest.on('rateLimited', (rateLimitInfo) => {
			logger.warn('[DiscordService] Rate limit hit:', {
				route: rateLimitInfo.route,
				timeToReset: rateLimitInfo.timeToReset,
				limit: rateLimitInfo.limit,
				method: rateLimitInfo.method,
			});
		});
	}

	private async setupGuildCaching(): Promise<void> {
		try {
			const guild = await this.getGuild(DefaultGuildId);

			// Enable maximum caching for the guild
			guild.members.cache.clear(); // Clear existing cache to ensure fresh state

			logger.info('[DiscordService] Setting up guild caching...');

			// Initial population of cache
			const members = await guild.members.fetch();
			logger.info(`[DiscordService] Successfully cached ${members.size} members`);

			// Setup sweep intervals to keep memory usage in check
			setInterval(
				() => {
					const beforeSize = guild.members.cache.size;
					guild.members.cache.sweep((member: GuildMember) => {
						// Keep members we've seen in the last hour
						const oneHourAgo = Date.now() - 60 * 60 * 1000;
						return member.joinedTimestamp ? member.joinedTimestamp < oneHourAgo : false;
					});
					const afterSize = guild.members.cache.size;
					logger.debug(`[DiscordService] Cache sweep completed: ${beforeSize - afterSize} members removed`);
				},
				30 * 60 * 1000,
			); // Run every 30 minutes
		} catch (error) {
			const errorObj = ensureError(error);
			if (errorObj instanceof GuildNotFoundError) {
				logger.warn(`[DiscordService] Guild ${DefaultGuildId} not accessible - skipping guild caching setup`);
				logger.warn(
					'[DiscordService] Bot may not have access to the configured GUILD_ID. Some features may be limited.',
				);
				return; // Continue without guild caching
			}
			logger.error('[DiscordService] Failed to setup guild caching:', errorObj);
			throw new DiscordServiceError('Failed to setup guild caching');
		}
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

	private handleMemberUpdate(
		oldMember: GuildMember | PartialGuildMember,
		newMember: GuildMember | PartialGuildMember,
	): void {
		// Skip partial members
		if (!(newMember instanceof GuildMember)) {
			logger.debug(`[DiscordService] Skipping partial member update for ${newMember.id}`);
			return;
		}

		const cacheKey = `${newMember.guild.id}:${newMember.id}`;
		this.memberCache.set(cacheKey, newMember);

		// Update bot identity if display name or avatar changed
		const avatarUrl = newMember.displayAvatarURL({ extension: 'png', size: 128 });
		if (newMember.displayName && avatarUrl) {
			this.botProfileCache.set(newMember.id, {
				botName: newMember.displayName,
				avatarUrl,
			});
			logger.debug(`[DiscordService] Updated cache for member ${newMember.id} due to update`);
		}
	}

	private handleMemberAdd(member: GuildMember | PartialGuildMember): void {
		// Skip partial members
		if (!(member instanceof GuildMember)) {
			logger.debug(`[DiscordService] Skipping partial member add for ${member.id}`);
			return;
		}

		const cacheKey = `${member.guild.id}:${member.id}`;
		this.memberCache.set(cacheKey, member);

		const avatarUrl = member.displayAvatarURL({ extension: 'png', size: 128 });
		if (member.displayName && avatarUrl) {
			this.botProfileCache.set(member.id, {
				botName: member.displayName,
				avatarUrl,
			});
			logger.debug(`[DiscordService] Added new member ${member.id} to cache`);
		}
	}

	private handleMemberRemove(member: GuildMember | PartialGuildMember): void {
		// Even with partial members, we can still remove from cache using IDs
		const cacheKey = `${member.guild.id}:${member.id}`;
		this.memberCache.delete(cacheKey);
		this.botProfileCache.delete(member.id);
		logger.debug(`[DiscordService] Removed member ${member.id} from cache`);
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
			const existingWebhook = webhooks.find((w) => w.owner?.id === this.client.user?.id);
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
				avatar: this.client.user.displayAvatarURL(),
			});
			this.webhookCache.set(cacheKey, newWebhook);
			return newWebhook;
		} catch (error) {
			logger.error(`[DiscordService] Error in getOrCreateWebhook: ${ensureError(error).message}`);
			throw new WebhookError(`Could not get or create webhook: ${ensureError(error).message}`);
		}
	}

	private startBotProfileRefresh(): void {
		logger.info('[DiscordService] Starting bot profile refresh setup...');

		// Prevent multiple job setups
		if (this.botProfileRefreshJob) {
			logger.info('[DiscordService] Bot profile refresh job already exists');
			const nextRun = this.botProfileRefreshJob.nextInvocation();
			logger.info('[DiscordService] Next scheduled refresh:', nextRun);
			return;
		}

		// Run immediately on startup with increased retries
		logger.info('[DiscordService] Initiating immediate bot profile refresh on startup');
		this.retryBotProfileRefresh(5).catch((error) => {
			logger.error('[DiscordService] Initial refresh failed:', ensureError(error));
		});

		// Set up periodic refresh - run every 30 minutes
		logger.info('[DiscordService] Configuring periodic bot profile refresh (every 30 minutes)');
		const rule = new schedule.RecurrenceRule();
		rule.minute = [0, 30]; // Run at 0 and 30 minutes of every hour

		this.botProfileRefreshJob = schedule.scheduleJob(rule, async () => {
			const startTime = Date.now();
			logger.info('[DiscordService] Starting scheduled bot profile refresh');
			logger.debug('[DiscordService] Current cache stats:', {
				members: this.memberCache.size,
				botProfiles: this.botProfileCache.size,
				channels: this.channelCache.size,
				roles: this.roleCache.size,
			});

			let success = false;
			let attempts = 0;
			const maxAttempts = 5;
			const retryDelay = 60000; // 1 minute between retries

			while (!success && attempts < maxAttempts) {
				attempts++;
				try {
					await this.retryBotProfileRefresh(3); // 3 retries per attempt
					success = true;
					const duration = Date.now() - startTime;
					logger.info(
						`[DiscordService] Completed scheduled refresh in ${duration}ms after ${attempts} attempt(s)`,
					);
					logger.debug('[DiscordService] Updated cache stats:', {
						members: this.memberCache.size,
						botProfiles: this.botProfileCache.size,
						channels: this.channelCache.size,
						roles: this.roleCache.size,
					});
				} catch (error) {
					const duration = Date.now() - startTime;
					logger.error(
						`[DiscordService] Attempt ${attempts}/${maxAttempts} failed after ${duration}ms:`,
						ensureError(error),
					);

					if (attempts < maxAttempts) {
						logger.info(`[DiscordService] Waiting ${retryDelay / 1000} seconds before next attempt...`);
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
					}
				}
			}

			if (!success) {
				logger.error(
					`[DiscordService] Failed to refresh after ${maxAttempts} attempts. Will try again next scheduled run.`,
				);
			}

			if (this.botProfileRefreshJob) {
				const nextRun = this.botProfileRefreshJob.nextInvocation();
				logger.debug('[DiscordService] Next refresh scheduled for:', nextRun);
			}
		});

		const initialNextRun = this.botProfileRefreshJob.nextInvocation();
		logger.info('[DiscordService] Bot profile refresh setup complete');
		logger.info('[DiscordService] Next refresh scheduled for:', initialNextRun);
	}

	protected async retryBotProfileRefresh(attempts: number = 3): Promise<void> {
		logger.info(`[DiscordService] Starting profile refresh with ${attempts} max attempts`);

		for (let i = 0; i < attempts; i++) {
			const attemptStartTime = Date.now();
			try {
				logger.info(`[DiscordService] Attempt ${i + 1}/${attempts} starting`);
				await this.refreshBotProfiles();
				const duration = Date.now() - attemptStartTime;
				logger.info(`[DiscordService] Attempt ${i + 1} succeeded in ${duration}ms`);
				return;
			} catch (error) {
				const duration = Date.now() - attemptStartTime;
				logger.error(`[DiscordService] Attempt ${i + 1} failed after ${duration}ms:`, ensureError(error));

				if (i === attempts - 1) {
					logger.error(
						`[DiscordService] All ${attempts} retry attempts failed. Last attempt took ${duration}ms.`,
					);
				} else {
					logger.info('[DiscordService] Waiting 5 seconds before next attempt...');
					await new Promise((resolve) => setTimeout(resolve, 5000));
				}
			}
		}
	}

	protected async refreshBotProfiles(): Promise<void> {
		try {
			// Check cooldown
			const _now = Date.now();
			if (_now - this.lastFetchTimestamp < this.FETCH_COOLDOWN) {
				logger.debug('[DiscordService] Skipping refresh due to cooldown');
				return;
			}
			this.lastFetchTimestamp = _now;

			logger.info('[DiscordService] Starting bot profile refresh');
			const guild = await this.getGuild(DefaultGuildId);

			// If we have members in Discord.js cache, use them
			if (guild.members.cache.size > 0) {
				logger.debug(`[DiscordService] Using ${guild.members.cache.size} cached members from Discord.js`);
				this.updateCachesFromGuild(guild);
				return;
			}

			// If cache is empty or force refresh needed, use WebSocket
			if (this.client.options.intents.has(GatewayIntentBits.GuildMembers)) {
				try {
					logger.debug('[DiscordService] Using WebSocket gateway to fetch members');
					await guild.members.fetch({ time: 30000 });
					this.updateCachesFromGuild(guild);
					return;
				} catch (error) {
					logger.warn('[DiscordService] WebSocket fetch failed:', ensureError(error));
				}
			}

			// Last resort: chunked fetching
			logger.debug('[DiscordService] Falling back to chunked member fetching');
			await this.fetchMembersInChunks(guild);
		} catch (error) {
			const err = ensureError(error);
			logger.error(`[DiscordService] Critical failure in bot profile refresh: ${err.message}`);
			throw new DiscordServiceError(`Failed to refresh bot profiles: ${err.message}`);
		}
	}

	private async fetchMembersInChunks(guild: Guild): Promise<void> {
		const previousCache = new Map(this.memberCache);
		const previousBotCache = new Map(this.botProfileCache);

		try {
			logger.debug('[DiscordService] Starting chunked member fetch');

			// First, get all current member IDs in the cache
			const cachedMemberIds = new Set(Array.from(this.memberCache.keys()).map((key) => key.split(':')[1]));

			// Fetch all members
			const members = await guild.members.fetch({ time: 60000 }); // Increased timeout to 60s

			// Sort members to prioritize uncached ones
			const sortedMembers = Array.from(members.values()).sort((a, b) => {
				const aIsCached = cachedMemberIds.has(a.id);
				const bIsCached = cachedMemberIds.has(b.id);
				if (aIsCached === bIsCached) return 0;
				return aIsCached ? 1 : -1; // Uncached members come first
			});

			// Process members in sorted order
			logger.info(
				`[DiscordService] Processing ${sortedMembers.length} members (${sortedMembers.filter((m) => !cachedMemberIds.has(m.id)).length} uncached)`,
			);
			this.updateCachesFromGuild(guild, sortedMembers);
		} catch (error) {
			logger.error('[DiscordService] Chunked fetch failed, restoring previous cache:', ensureError(error));
			this.memberCache = previousCache;
			this.botProfileCache = previousBotCache;
		}
	}

	private updateCachesFromGuild(guild: Guild, members?: GuildMember[]): void {
		const tempCache = new Map<string, GuildMember>();
		const tempBotCache = new Map<string, BotIdentity>();
		let validMembers = 0;
		let invalidMembers = 0;
		let newMembers = 0;
		let updatedMembers = 0;

		// Use provided members array or fall back to guild cache
		const membersToProcess = members || Array.from(guild.members.cache.values());

		membersToProcess.forEach((member) => {
			try {
				const cacheKey = `${guild.id}:${member.id}`;
				const existingMember = this.memberCache.get(cacheKey);

				// Check if this is a new or updated member
				if (!existingMember) {
					newMembers++;
				} else if (
					existingMember.nickname !== member.nickname ||
					existingMember.displayName !== member.displayName ||
					existingMember.avatar !== member.avatar
				) {
					updatedMembers++;
				}

				tempCache.set(cacheKey, member);

				const avatarUrl = member.displayAvatarURL({ extension: 'png', size: 128 });
				if (!member.displayName || !avatarUrl) {
					logger.warn(`[DiscordService] Invalid member data - ID: ${member.id}`);
					invalidMembers++;
					return;
				}

				tempBotCache.set(member.id, {
					botName: member.displayName,
					avatarUrl,
				});
				validMembers++;
			} catch (error) {
				const err = ensureError(error);
				logger.error(`[DiscordService] Failed to process member ${member.id}: ${err.message}`);
				invalidMembers++;
			}
		});

		this.memberCache = tempCache;
		this.botProfileCache = tempBotCache;

		logger.info(
			`[DiscordService] Updated caches - Valid: ${validMembers}, Invalid: ${invalidMembers}, New: ${newMembers}, Updated: ${updatedMembers}`,
		);
		logger.debug('[DiscordService] Cache sizes:', {
			members: this.memberCache.size,
			botProfiles: this.botProfileCache.size,
			newMembers,
			updatedMembers,
		});
	}

	public async getBotProfile(userId: string, forceRefresh: boolean = false): Promise<BotIdentity> {
		try {
			const profile = this.botProfileCache.get(userId);
			if (!profile || !profile.botName || !profile.avatarUrl || forceRefresh) {
				// Fallback to direct fetch if not in cache or invalid cache entry
				logger.debug(
					`[DiscordService] Bot profile for ${userId} not in cache or refresh requested, fetching directly`,
				);
				return await this.getMemberAsBotIdentity(userId, forceRefresh);
			}
			return profile;
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to get bot profile for ${userId}:`, errorMessage);
			throw errorMessage;
		}
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
					member = await this.getMemberAsync(DefaultGuildId, userId);
				}
			} catch (memberError) {
				const errorMessage = ensureError(memberError);
				logger.error(`[DiscordService] Failed to get member ${userId}:`, errorMessage);
				throw errorMessage;
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

			logger.debug(
				`[DiscordService] Created bot identity for user ${userId}: ${botName} with avatar ${avatarUrl}`,
			);
			return identity;
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to get bot identity for user ${userId}:`, errorMessage);
			throw errorMessage;
		}
	}

	public getMember(guildId: string, memberId: string): GuildMember {
		const cacheKey = `${guildId}:${memberId}`;

		const cachedMember = this.memberCache.get(cacheKey);
		if (cachedMember) {
			return cachedMember;
		}

		const guild = this.getGuild(guildId);
		const member = guild.members.cache.get(memberId);
		if (!member) {
			throw new MemberNotFoundError(memberId);
		}

		// Cache the result
		this.memberCache.set(cacheKey, member);
		return member;
	}

	/**
	 * Async version of getMember that fetches from API if not in cache
	 */
	public async getMemberAsync(guildId: string, memberId: string): Promise<GuildMember> {
		const cacheKey = `${guildId}:${memberId}`;

		// Check our cache first
		const cachedMember = this.memberCache.get(cacheKey);
		if (cachedMember) {
			return cachedMember;
		}

		const guild = this.getGuild(guildId);

		// Check Discord's cache
		let member = guild.members.cache.get(memberId);
		if (member) {
			// Cache the result
			this.memberCache.set(cacheKey, member);
			return member;
		}

		// Not in cache, fetch from API
		try {
			member = await guild.members.fetch({ user: memberId, force: false });

			// Cache the result
			this.memberCache.set(cacheKey, member);
			return member;
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to fetch member ${memberId} from guild ${guildId}:`, errorMessage);
			throw new MemberNotFoundError(memberId);
		}
	}

	public async sendMessage(channelId: string, message: string): Promise<Message | null> {
		// CRITICAL: Debug mode channel filtering safety check
		// This is the final safety net to prevent messages from being sent to non-whitelisted channels
		const { getMessageFilter } = await import('./message-filter');
		const messageFilter = getMessageFilter();

		if (messageFilter.isDebugMode()) {
			const testingChannelIds = messageFilter.getTestingChannelIds();
			if (testingChannelIds.length > 0 && !testingChannelIds.includes(channelId)) {
				logger.warn(
					`[DiscordService] 🚫 DEBUG MODE: Blocking message to channel ${channelId} - not in TESTING_CHANNEL_IDS whitelist`,
				);
				logger.debug(`[DiscordService] Whitelisted channels: [${testingChannelIds.join(', ')}]`);
				return null; // Silently discard the message
			}
		}

		const channel = this.getTextChannel(channelId);
		return channel.send(message);
	}

	public async sendMessageWithBotIdentity(
		channelId: string,
		botIdentity: BotIdentity,
		message: string,
	): Promise<void> {
		if (!botIdentity || !botIdentity.botName || !botIdentity.avatarUrl) {
			logger.error(`[DiscordService] Invalid bot identity provided for message to channel ${channelId}`);
			return; // Skip sending the message with invalid identity
		}

		// CRITICAL: Debug mode channel filtering safety check
		// This is the final safety net to prevent messages from being sent to non-whitelisted channels
		const { getMessageFilter } = await import('./message-filter');
		const messageFilter = getMessageFilter();

		if (messageFilter.isDebugMode()) {
			const testingChannelIds = messageFilter.getTestingChannelIds();
			if (testingChannelIds.length > 0 && !testingChannelIds.includes(channelId)) {
				logger.warn(
					`[DiscordService] 🚫 DEBUG MODE: Blocking message to channel ${channelId} - not in TESTING_CHANNEL_IDS whitelist`,
				);
				logger.debug(`[DiscordService] Whitelisted channels: [${testingChannelIds.join(', ')}]`);
				return; // Silently discard the message
			}
		}

		try {
			const channel = this.getTextChannel(channelId);
			const webhook = await this.getOrCreateWebhook(channel);

			logger.debug(
				`[DiscordService] Sending webhook message with identity: ${botIdentity.botName}, avatar: ${botIdentity.avatarUrl}`,
			);

			await webhook.send({
				content: message,
				username: botIdentity.botName,
				avatarURL: botIdentity.avatarUrl,
			});
			logger.debug(`[DiscordService] Message sent to channel ${channelId} via webhook as ${botIdentity.botName}`);
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(
				`[DiscordService] Failed to send message with bot identity to channel ${channelId}:`,
				errorMessage,
			);
			// Intentionally not attempting fallback to protect identity
			throw errorMessage;
		}
	}

	public async sendWebhookMessage(channel: TextChannel, messageInfo: WebhookMessageInfo): Promise<void> {
		// Validate identity information before sending
		if (!messageInfo.username && !messageInfo.botName) {
			throw new WebhookError('Missing username/botName in webhook message');
		}

		if (!messageInfo.avatarURL && !messageInfo.avatarUrl) {
			throw new WebhookError('Missing avatarURL/avatarUrl in webhook message');
		}

		// CRITICAL: Debug mode channel filtering safety check
		// This is the final safety net to prevent messages from being sent to non-whitelisted channels
		const { getMessageFilter } = await import('./message-filter');
		const messageFilter = getMessageFilter();

		if (messageFilter.isDebugMode()) {
			const testingChannelIds = messageFilter.getTestingChannelIds();
			if (testingChannelIds.length > 0 && !testingChannelIds.includes(channel.id)) {
				logger.warn(
					`[DiscordService] 🚫 DEBUG MODE: Blocking webhook message to channel ${channel.id} - not in TESTING_CHANNEL_IDS whitelist`,
				);
				logger.debug(`[DiscordService] Whitelisted channels: [${testingChannelIds.join(', ')}]`);
				return; // Silently discard the message
			}
		}

		try {
			const webhook = await this.getOrCreateWebhook(channel);
			await webhook.send({
				content: messageInfo.content,
				username: messageInfo.username || messageInfo.botName,
				avatarURL: messageInfo.avatarURL || messageInfo.avatarUrl,
				embeds: messageInfo.embeds || [],
			});
			logger.debug(`[DiscordService] Webhook message sent to channel ${channel.name}`);
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to send webhook message:`, errorMessage);
			throw errorMessage;
		}
	}

	public getUser(userId: string): User {
		const user = this.client.users.cache.get(userId);
		if (!user) {
			throw new UserNotFoundError(userId);
		}
		return user;
	}

	public async getRandomBotProfile(): Promise<BotIdentity> {
		try {
			const profiles = Array.from(this.botProfileCache.values()).filter(
				(profile) => profile.botName && profile.avatarUrl,
			); // Only consider valid profiles

			if (profiles.length === 0) {
				// Fallback to getting a random member's identity if cache is empty
				logger.debug('[DiscordService] No valid bot profiles in cache, fetching random member');
				return await this.getRandomMemberAsBotIdentity();
			}

			const randomIndex = Math.floor(Math.random() * profiles.length);
			return profiles[randomIndex];
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to get random bot profile:`, errorMessage);
			throw errorMessage;
		}
	}

	public async getRandomMemberAsBotIdentity(): Promise<BotIdentity> {
		try {
			const guild = this.getGuild(DefaultGuildId);
			let members = Array.from(guild.members.cache.values());

			// If no members in cache, fetch them from API
			if (members.length === 0) {
				logger.debug('[DiscordService] No members in cache, fetching from API...');
				try {
					await guild.members.fetch({ limit: 100 }); // Fetch up to 100 members
					members = Array.from(guild.members.cache.values());
				} catch (fetchError) {
					const errorMessage = ensureError(fetchError);
					logger.error('[DiscordService] Failed to fetch guild members:', errorMessage);
					throw new Error('Failed to fetch guild members for random selection');
				}
			}

			if (members.length === 0) {
				throw new Error('No members found in guild after fetching');
			}

			// Filter out bots to avoid selecting bot accounts
			const humanMembers = members.filter((member) => !member.user.bot);
			if (humanMembers.length === 0) {
				logger.warn('[DiscordService] No human members found, using all members including bots');
				// Fallback to all members if no humans found
			}

			const membersToChooseFrom = humanMembers.length > 0 ? humanMembers : members;
			const randomIndex = Math.floor(Math.random() * membersToChooseFrom.length);
			const member = membersToChooseFrom[randomIndex];

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

			logger.debug(`[DiscordService] Selected random member: ${botName} (${member.id})`);
			return { botName, avatarUrl };
		} catch (error) {
			const errorMessage = ensureError(error);
			logger.error(`[DiscordService] Failed to get random member as bot identity:`, errorMessage);
			throw errorMessage;
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
}
