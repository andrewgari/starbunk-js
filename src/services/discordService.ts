import { Client, Guild, Message, MessageReaction, Role, TextChannel, User, VoiceChannel } from "discord.js";

import guildIds from "@/discord/guildIds";
import { BotIdentity } from "@/starbunk/types/botIdentity";
import { GuildMember } from "discord.js";
import {
	ChannelNotFoundError,
	DiscordServiceError,
	GuildNotFoundError,
	MemberNotFoundError,
	RoleNotFoundError,
	UserNotFoundError
} from "./errors/discordErrors";
import { WebhookService } from "./services";

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

	private constructor(private readonly client: Client, private readonly webhookService: WebhookService) { }

	/**
	 * Initialize the Discord service singleton
	 * @param client Discord.js client
	 * @param webhookService Webhook service
	 * @returns The DiscordService instance
	 */
	public static initialize(client: Client, webhookService: WebhookService): DiscordService {
		if (!discordServiceInstance) {
			discordServiceInstance = new DiscordService(client, webhookService);
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
	clearCache(): void {
		this.memberCache.clear();
		this.channelCache.clear();
		this.guildCache.clear();
		this.roleCache.clear();
	}

	sendMessage(channelId: string, message: string): Message {
		const channel = this.getTextChannel(channelId);
		return channel.send(message) as unknown as Message;
	}

	sendMessageWithBotIdentity(channelId: string, botIdentity: BotIdentity, message: string): void {
		const channel = this.getTextChannel(channelId);
		this.webhookService.writeMessage(channel, {
			content: message,
			username: botIdentity.botName,
			avatarURL: botIdentity.avatarUrl
		});
	}

	sendBulkMessages(options: BulkMessageOptions): Message[] {
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

	getUser(userId: string): User {
		const user = this.client.users.cache.get(userId);
		if (!user) {
			throw new UserNotFoundError(userId);
		}
		return user;
	}

	getMember(guildId: string, memberId: string): GuildMember {
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

	getMemberByUsername(guildId: string, username: string): GuildMember {
		const member = this.client.guilds.cache.get(guildId)?.members.cache.find(m => m.user.username === username);
		if (!member) {
			throw new MemberNotFoundError(username);
		}
		return member;
	}

	getRandomMember(guildId: string = DefaultGuildId): GuildMember {
		const members = this.getMembersWithRole(guildId, "member");
		return members[Math.floor(Math.random() * members.length)];
	}

	getMemberAsBotIdentity(userId: string): BotIdentity {
		const member = this.getMember(DefaultGuildId, userId);
		if (!member) {
			throw new MemberNotFoundError(userId);
		}

		return {
			botName: member.nickname ?? member.user.username,
			avatarUrl: member.displayAvatarURL() ?? member.user.displayAvatarURL()
		};
	}

	getRandomMemberAsBotIdentity(): BotIdentity {
		const member = this.getRandomMember();
		if (!member) {
			throw new MemberNotFoundError("random member");
		}

		return {
			botName: member.nickname ?? member.user.username,
			avatarUrl: member.displayAvatarURL() ?? member.user.displayAvatarURL()
		};
	}

	getTextChannel(channelId: string): TextChannel {
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

	getVoiceChannel(channelId: string): VoiceChannel {
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

	getVoiceChannelFromMessage(message: Message): VoiceChannel {
		return this.getVoiceChannel(message.channel.id);
	}

	getGuild(guildId: string): Guild {
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

	getRole(guildId: string, roleId: string): Role {
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

	getMembersWithRole(guildId: string, roleId: string): GuildMember[] {
		const guild = this.getGuild(guildId);
		return Array.from(guild.members.cache.values())
			.filter(m => m.roles.cache.has(roleId))
			.map(m => m as GuildMember);
	}

	addReaction(messageId: string, channelId: string, emoji: string): MessageReaction {
		const channel = this.getTextChannel(channelId);
		const message = channel.messages.cache.get(messageId);
		if (!message) {
			throw new Error(`Message ${messageId} not found in channel ${channelId}`);
		}
		return message.react(emoji) as unknown as MessageReaction;
	}

	removeReaction(messageId: string, channelId: string, emoji: string): void {
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

	isBunkBotMessage(message: Message): boolean {
		return message.author.bot && message.author.id === this.client.user?.id;
	}
}

