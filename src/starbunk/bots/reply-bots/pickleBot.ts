import UserID from '@/discord/userID';
import ReplyBot from '@/starbunk/bots/replyBot';
import Random from '@/utils/random';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class PickleBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}

	private readonly botname = 'GremlinBot';
	private readonly avatarUrl = 'https://i.imgur.com/D0czJFu.jpg';
	private readonly response = "Could you repeat that? I don't speak *gremlin*";
	private readonly pattern = /gremlin/i;

	getBotName(): string {
		return this.botname;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern) || (message.author.id === UserID.Sig && Random.percentChance(15))) {
			this.sendReply(message.channel as TextChannel, this.response);
		}
	}
}
