import { Message, TextChannel } from 'discord.js';
import roleIDs from '../../../discord/roleIDs';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class SoggyBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private readonly botName = 'SoggyBot';
	private readonly avatarUrl = 'https://imgur.com/OCB6i4x.jpg';
	private readonly pattern = /wet bread/i;
	private readonly response = 'Sounds like somebody enjoys wet bread';

	getBotName(): string {
		return this.botName;
	}
	getAvatarUrl(): string {
		return this.avatarUrl;
	}
	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (
			message.content.match(this.pattern) &&
			message.member?.roles.cache.some((role) => role.id === roleIDs.WetBread)
		) {
			await this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
