import { Client, Guild, Message, MessageReaction, Role, TextChannel, User, VoiceChannel } from "discord.js";

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

export class DiscordService {
	private memberCache = new Map<string, GuildMember>();
	private channelCache = new Map<string, TextChannel | VoiceChannel>();
	private guildCache = new Map<string, Guild>();
	private roleCache = new Map<string, Role>();

	constructor(private readonly client: Client, private readonly webhookService: WebhookService) { }

	// Retry logic for API operations
	private async retry<T>(operation: () => Promise<T>, attempts = 3, delay = 1000): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (attempts <= 1) throw error;
			await new Promise(resolve => setTimeout(resolve, delay));
			return this.retry(operation, attempts - 1, delay * 1.5);
		}
	}

	// Clear all caches
	clearCache(): void {
		this.memberCache.clear();
		this.channelCache.clear();
		this.guildCache.clear();
		this.roleCache.clear();
	}

	async sendMessage(channelId: string, message: string): Promise<Message> {
		return this.retry(async () => {
			const channel = await this.getTextChannel(channelId);
			return channel.send(message);
		});
	}

	async sendMessageWithBotIdentity(channelId: string, botIdentity: BotIdentity, message: string): Promise<void> {
		return this.retry(async () => {
			return this.webhookService.writeMessage(await this.getTextChannel(channelId), {
				content: message,
				username: botIdentity.botName,
				avatarURL: botIdentity.avatarUrl
			});
		});
	}

	async sendBulkMessages(options: BulkMessageOptions): Promise<Message[]> {
		const promises = options.channelIds.map(channelId => {
			if (options.botIdentity) {
				return this.sendMessageWithBotIdentity(channelId, options.botIdentity, options.message)
					.then(() => null);
			} else {
				return this.sendMessage(channelId, options.message);
			}
		});

		const results = await Promise.allSettled(promises);

		return results
			.filter((result): result is PromiseFulfilledResult<Message> =>
				result.status === 'fulfilled' && result.value !== null)
			.map(result => result.value);
	}

	async getUser(userId: string): Promise<User> {
		return this.retry(async () => {
			const user = this.client.users.cache.get(userId);
			if (!user) {
				throw new UserNotFoundError(userId);
			}
			return user;
		});
	}

	async getMember(guildId: string, memberId: string): Promise<GuildMember> {
		const cacheKey = `${guildId}:${memberId}`;

		if (this.memberCache.has(cacheKey)) {
			return this.memberCache.get(cacheKey)!;
		}

		return this.retry(async () => {
			const member = this.client.guilds.cache.get(guildId)?.members.cache.get(memberId);
			if (!member) {
				throw new MemberNotFoundError(memberId);
			}

			// Cache the result
			this.memberCache.set(cacheKey, member);
			return member;
		});
	}

	async getMemberByUsername(guildId: string, username: string): Promise<GuildMember> {
		return this.retry(async () => {
			const member = this.client.guilds.cache.get(guildId)?.members.cache.find(m => m.user.username === username);
			if (!member) {
				throw new MemberNotFoundError(username);
			}
			return member;
		});
	}

	async getRandomMember(guildId: string): Promise<GuildMember> {
		const members = await this.getMembersWithRole(guildId, "member");
		return members[Math.floor(Math.random() * members.length)];
	}

	async getTextChannel(channelId: string): Promise<TextChannel> {
		if (this.channelCache.has(channelId)) {
			const channel = this.channelCache.get(channelId);
			if (channel instanceof TextChannel) {
				return channel;
			}
		}

		return this.retry(async () => {
			const channel = this.client.channels.cache.get(channelId);
			if (!channel) {
				throw new ChannelNotFoundError(channelId);
			}

			if (!(channel instanceof TextChannel)) {
				throw new DiscordServiceError(`Channel ${channelId} is not a text channel`);
			}

			this.channelCache.set(channelId, channel);
			return channel;
		});
	}

	async getVoiceChannel(channelId: string): Promise<VoiceChannel> {
		if (this.channelCache.has(channelId)) {
			const channel = this.channelCache.get(channelId);
			if (channel instanceof VoiceChannel) {
				return channel;
			}
		}

		return this.retry(async () => {
			const channel = this.client.channels.cache.get(channelId);
			if (!channel) {
				throw new ChannelNotFoundError(channelId);
			}

			if (!(channel instanceof VoiceChannel)) {
				throw new DiscordServiceError(`Channel ${channelId} is not a voice channel`);
			}

			this.channelCache.set(channelId, channel);
			return channel;
		});
	}

	async getVoiceChannelFromMessage(message: Message): Promise<VoiceChannel> {
		return this.getVoiceChannel(message.channel.id);
	}

	async getGuild(guildId: string): Promise<Guild> {
		if (this.guildCache.has(guildId)) {
			return this.guildCache.get(guildId)!;
		}

		return this.retry(async () => {
			const guild = this.client.guilds.cache.get(guildId);
			if (!guild) {
				throw new GuildNotFoundError(guildId);
			}

			this.guildCache.set(guildId, guild);
			return guild;
		});
	}

	async getRole(guildId: string, roleId: string): Promise<Role> {
		const cacheKey = `${guildId}:${roleId}`;

		if (this.roleCache.has(cacheKey)) {
			return this.roleCache.get(cacheKey)!;
		}

		return this.retry(async () => {
			const role = this.client.guilds.cache.get(guildId)?.roles.cache.get(roleId);
			if (!role) {
				throw new RoleNotFoundError(roleId);
			}

			this.roleCache.set(cacheKey, role);
			return role;
		});
	}

	async getMembersWithRole(guildId: string, roleId: string): Promise<GuildMember[]> {
		return this.retry(async () => {
			const guild = await this.getGuild(guildId);
			const members = await guild.members.fetch();
			return members.filter(m => m.roles.cache.has(roleId)).map(m => m as GuildMember);
		});
	}

	async addReaction(messageId: string, channelId: string, emoji: string): Promise<MessageReaction> {
		return this.retry(async () => {
			const channel = await this.getTextChannel(channelId);
			const message = await channel.messages.fetch(messageId);
			return message.react(emoji);
		});
	}

	async removeReaction(messageId: string, channelId: string, emoji: string): Promise<void> {
		return this.retry(async () => {
			const channel = await this.getTextChannel(channelId);
			const message = await channel.messages.fetch(messageId);
			const userReactions = message.reactions.cache.get(emoji);

			if (userReactions) {
				const botUser = this.client.user;
				if (botUser) {
					await userReactions.users.remove(botUser.id);
				}
			}
		});
	}
}

