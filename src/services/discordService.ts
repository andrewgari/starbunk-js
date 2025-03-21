import { Client, Guild, Message, Role, VoiceChannel } from "discord.js";

import { BotIdentity } from "@/starbunk/types/botIdentity";
import { GuildMember, TextChannel, User } from "discord.js";
import { WebhookService } from "./services";

export interface IDiscordService {
	sendMessage(channelId: string, message: string): Promise<Message>;
	sendMessageWithBotIdentity(channelId: string, botIdentity: BotIdentity, message: string): Promise<void>;

	getUser(userId: string): Promise<User>;
	getMember(guildId: string, memberId: string): Promise<GuildMember>;
	getMemberByUsername(guildId: string, username: string): Promise<GuildMember>;
	getRandomMember(guildId: string): Promise<GuildMember>;

	getTextChannel(channelId: string): Promise<TextChannel>;
	getVoiceChannel(channelId: string): Promise<VoiceChannel>;
	getGuild(guildId: string): Promise<Guild>;

	getRole(guildId: string, roleId: string): Promise<Role>;
	getMembersWithRole(guildId: string, roleId: string): Promise<GuildMember[]>;
}

export class DiscordService implements IDiscordService {
	constructor(private readonly client: Client, private readonly webhookService: WebhookService) { }

	async sendMessage(channelId: string, message: string): Promise<Message> {
		const channel = this.client.channels.cache.get(channelId) as TextChannel;
		if (!channel) {
			throw new Error(`Channel not found: ${channelId}`);
		}

		return channel.send(message);
	}

	async sendMessageWithBotIdentity(channelId: string, botIdentity: BotIdentity, message: string): Promise<void> {
		return this.webhookService.writeMessage(await this.getTextChannel(channelId), {
			content: message,
			username: botIdentity.botName,
			avatarURL: botIdentity.avatarUrl
		});
	}

	async getUser(userId: string): Promise<User> {
		const user = this.client.users.cache.get(userId);
		if (!user) {
			throw new Error(`User not found: ${userId}`);
		}
		return user;
	}

	async getMember(guildId: string, memberId: string): Promise<GuildMember> {
		const member = this.client.guilds.cache.get(guildId)?.members.cache.get(memberId);
		if (!member) {
			throw new Error(`Member not found: ${memberId}`);
		}
		return member;
	}

	async getMemberByUsername(guildId: string, username: string): Promise<GuildMember> {
		const member = this.client.guilds.cache.get(guildId)?.members.cache.find(m => m.user.username === username);
		if (!member) {
			throw new Error(`Member not found: ${username}`);
		}
		return member;
	}

	async getRandomMember(guildId: string): Promise<GuildMember> {
		const members = await this.getMembersWithRole(guildId, "member");
		return members[Math.floor(Math.random() * members.length)];
	}

	async getTextChannel(channelId: string): Promise<TextChannel> {
		const channel = this.client.channels.cache.get(channelId);
		if (!channel) {
			throw new Error(`Channel not found: ${channelId}`);
		}

		return channel as TextChannel;
	}


	async getVoiceChannel(channelId: string): Promise<VoiceChannel> {
		const channel = this.client.channels.cache.get(channelId);
		if (!channel) {
			throw new Error(`Channel not found: ${channelId}`);
		}

		return channel as VoiceChannel;
	}

	async getVoiceChannelFromMessage(message: Message): Promise<VoiceChannel> {
		return this.getVoiceChannel(message.channel.id);
	}

	async getGuild(guildId: string): Promise<Guild> {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) {
			throw new Error(`Guild not found: ${guildId}`);
		}
		return guild;
	}


	async getRole(guildId: string, roleId: string): Promise<Role> {
		const role = this.client.guilds.cache.get(guildId)?.roles.cache.get(roleId);
		if (!role) {
			throw new Error(`Role not found: ${roleId}`);
		}
		return role;
	}

	async getMembersWithRole(guildId: string, roleId: string): Promise<GuildMember[]> {
		const members = await (await this.getGuild(guildId)).members.fetch();
		return members.filter(m => m.roles.cache.has(roleId)).map(m => m as GuildMember);
	}
}

