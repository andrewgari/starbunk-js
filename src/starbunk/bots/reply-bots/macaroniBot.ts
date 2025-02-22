import userID from '@/discord/userID';
import { Logger } from '@/services/logger';
import ReplyBot from '@/starbunk/bots/replyBot';
import { WebhookService } from '@/webhooks/webhookService';
import { Message, TextChannel } from 'discord.js';

export default class MacaroniBot extends ReplyBot {
	constructor(webhookService: WebhookService, protected readonly logger = Logger) {
		super(webhookService);
	}

	private readonly botName = 'Macaroni Bot';
	private readonly macaroniPattern = /\b(mac(aroni)?|pasta)\b/i;
	private readonly vennPattern = /\bvenn\b/i;
	private readonly macaroniResponse = 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
	private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	handleMessage(message: Message<boolean>): void {
		if (message.author.bot) return;

		if (message.content.match(this.macaroniPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned macaroni/pasta: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, this.macaroniResponse);
		} else if (message.content.match(this.vennPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned Venn: "${message.content}"`);
			this.sendReply(message.channel as TextChannel, `Are you trying to reach <@${userID.Venn}>`);
		}
	}
}
