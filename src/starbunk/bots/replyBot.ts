import { Message, TextChannel } from 'discord.js';
import { ILogger } from '../../services/Logger';
import loggerFactory from '../../services/LoggerFactory';
import webhookService from '../../webhooks/webhookService';

export default abstract class ReplyBot {
	protected logger: ILogger;

	constructor(logger?: ILogger) {
		this.logger = logger || loggerFactory.getLogger();
	}

	abstract botName: string;
	defaultBotName(): string {
		return this.botName;
	}
	abstract avatarUrl: string;
	abstract handleMessage(message: Message): void;
	sendReply(channel: TextChannel, response: string): void {
		try {
			webhookService.writeMessage(channel, {
				username: this.botName,
				avatarURL: this.avatarUrl,
				content: response,
				embeds: [],
			});
		} catch (error) {
			this.logger.error(`Failed to send reply to channel ${channel.id}: ${error}`);
		}
	}
	isSelf(message: Message): boolean {
		return message.author.bot && message.author.id === message.client.user?.id;
	}
}
