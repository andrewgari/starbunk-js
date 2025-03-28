import { Client, Guild, Message, MessageReaction, Role, TextChannel, User, VoiceChannel, Webhook } from "discord.js";

import guildIds from "@/discord/guildIds";
import { BotIdentity } from "@/starbunk/types/botIdentity";
import { GuildMember } from "discord.js";
import { logger } from "../services/logger";
import {
	ChannelNotFoundError,
	DiscordServiceError,
	GuildNotFoundError,
	MemberNotFoundError,
	RoleNotFoundError,
	UserNotFoundError
} from "./errors/discordErrors";

export interface BulkMessageOptions {
	channelIds: string[];
	message: string;
	botIdentity?: BotIdentity;
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

	private constructor(private readonly client: Client) {
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

		// Try to find existing webhook
		const webhooks = await channel.fetchWebhooks();
		const existingWebhook = webhooks.find(w => w.owner?.id === this.client.user?.id);
		if (existingWebhook) {
			this.webhookCache.set(cacheKey, existingWebhook);
			return existingWebhook;
		}

		// Create new webhook if none exists
		const newWebhook = await channel.createWebhook({
			name: 'Starbunk Bot',
			avatar: this.client.user?.displayAvatarURL()
		});
		this.webhookCache.set(cacheKey, newWebhook);
		return newWebhook;
	}

	private startBotProfileRefresh(): void {
		// Initial refresh
		this.refreshBotProfiles().catch(error => {
			console.error('Failed to refresh bot profiles:', error);
		});

		// Set up hourly refresh
		this.botProfileRefreshInterval = setInterval(() => {
			this.refreshBotProfiles().catch(error => {
				console.error('Failed to refresh bot profiles:', error);
			});
		}, 60 * 60 * 1000); // 1 hour
	}

	private async refreshBotProfiles(): Promise<void> {
		try {
			const guild = await this.getGuild(DefaultGuildId);
			if (!guild) {
				logger.warn(`Default guild ${DefaultGuildId} not found. Bot profile refresh will be skipped.`);
				return;
			}

			const members = await guild.members.fetch();
			this.memberCache.clear();
			members.forEach(member => {
				this.memberCache.set(member.id, member);
			});
			logger.debug(`Refreshed bot profiles for ${members.size} members`);
		} catch (error) {
			logger.warn('Failed to refresh bot profiles:', error instanceof Error ? error : new Error(String(error)));
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
		return profiles[Math.floor(Math.random() * profiles.length)];
	}

	/**
	 * Initialize the Discord service singleton
	 * @param client Discord.js client
	 * @returns The DiscordService instance
	 */
	public static initialize(client: Client): DiscordService {
		if (!discordServiceInstance) {
			discordServiceInstance = new DiscordService(client);
		}
		return discordServiceInstance;
	}

	/**
	 * Get the Discord service instance. Must call initialize first.
	 * @returns The DiscordService instance
	 * @throws Error if the service hasn't been initialized
	 */
	public static getInstance(): DiscordService {
		if (!discordServiceInstance) {
			throw new Error("DiscordService not initialized. Call initialize() first.");
		}
		return discordServiceInstance;
	}

	// Clear all caches
	public clearCache(): void {
		this.memberCache.clear();
		this.channelCache.clear();
		this.guildCache.clear();
		this.roleCache.clear();
		this.webhookCache.clear();
	}

	public sendMessage(channelId: string, message: string): Message {
		const channel = this.getTextChannel(channelId);
		return channel.send(message) as unknown as Message;
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

	public sendBulkMessages(options: BulkMessageOptions): Message[] {
		const results: Message[] = [];

		for (const channelId of options.channelIds) {
			try {
				if (options.botIdentity) {
					this.sendMessageWithBotIdentity(channelId, options.botIdentity, options.message);
				} else {
					const message = this.sendMessage(channelId, options.message);
					results.push(message);
				}
			} catch (error) {
				console.error(`Failed to send message to channel ${channelId}:`, error);
			}
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

		if (this.memberCache.has(cacheKey)) {
			return this.memberCache.get(cacheKey)!;
		}

		const member = this.client.guilds.cache.get(guildId)?.members.cache.get(memberId);
		if (!member) {
			throw new MemberNotFoundError(memberId);
		}

		// Cache the result
		this.memberCache.set(cacheKey, member);
		return member;
	}

	public getMemberByUsername(guildId: string, username: string): GuildMember {
		const member = this.client.guilds.cache.get(guildId)?.members.cache.find(m => m.user.username === username);
		if (!member) {
			throw new MemberNotFoundError(username);
		}
		return member;
	}

	public getRandomMember(guildId: string = DefaultGuildId): GuildMember {
		const members = this.getMembersWithRole(guildId, "member");
		return members[Math.floor(Math.random() * members.length)];
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
		if (this.channelCache.has(channelId)) {
			const channel = this.channelCache.get(channelId);
			if (channel instanceof TextChannel) {
				return channel;
			}
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
		if (this.channelCache.has(channelId)) {
			const channel = this.channelCache.get(channelId);
			if (channel instanceof VoiceChannel) {
				return channel;
			}
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
		if (this.guildCache.has(guildId)) {
			return this.guildCache.get(guildId)!;
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

		if (this.roleCache.has(cacheKey)) {
			return this.roleCache.get(cacheKey)!;
		}

		const role = this.client.guilds.cache.get(guildId)?.roles.cache.get(roleId);
		if (!role) {
			throw new RoleNotFoundError(roleId);
		}

		this.roleCache.set(cacheKey, role);
		return role;
	}

	public getMembersWithRole(guildId: string, roleId: string): GuildMember[] {
		const guild = this.getGuild(guildId);
		return Array.from(guild.members.cache.values())
			.filter(m => m.roles.cache.has(roleId))
			.map(m => m as GuildMember);
	}

	public addReaction(messageId: string, channelId: string, emoji: string): MessageReaction {
		const channel = this.getTextChannel(channelId);
		const message = channel.messages.cache.get(messageId);
		if (!message) {
			throw new Error(`Message ${messageId} not found in channel ${channelId}`);
		}
		return message.react(emoji) as unknown as MessageReaction;
	}

	public removeReaction(messageId: string, channelId: string, emoji: string): void {
		const channel = this.getTextChannel(channelId);
		const message = channel.messages.cache.get(messageId);
		if (!message) {
			throw new Error(`Message ${messageId} not found in channel ${channelId}`);
		}

		const userReactions = message.reactions.cache.get(emoji);
		if (userReactions) {
			const botUser = this.client.user;
			if (botUser) {
				userReactions.users.remove(botUser.id);
			}
		}
	}

	public isBunkBotMessage(message: Message): boolean {
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

