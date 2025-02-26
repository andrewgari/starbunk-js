import { Message, TextChannel } from 'discord.js';
import Random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class BotBot extends ReplyBot {
	constructor(param: WebhookService | unknown) {
		super(param);
	}
	private readonly botName = 'BotBot';
	private readonly avatarUrl = 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png';
	private readonly response: string = 'Hello fellow bot!';

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (!message.author.bot || this.isSelf(message)) return;

		if (Random.percentChance(5)) {
			await this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
