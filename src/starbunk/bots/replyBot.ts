import { Message, TextChannel } from 'discord.js';
import webhookService from '../../webhooks/webhookService';

export default abstract class ReplyBot {
	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}
	abstract avatarUrl: string;
	abstract handleMessage(message: Message): void;
	sendReply(channel: TextChannel, response: string): void {
		webhookService.writeMessage(channel, {
			username: this.botName,
			avatarURL: this.avatarUrl,
			content: response,
			embeds: [],
		});
	}
	isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}
}
