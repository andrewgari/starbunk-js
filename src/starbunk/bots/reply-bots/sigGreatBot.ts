import { Message, TextChannel } from 'discord.js';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class SigBestBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}

	botName: string = 'SigBestBot';
	avatarUrl: string = 'PickleSig.comOrWhatever';
	readonly pattern = /^(?=.*\bsig(g?les)?\b)(?=.*best\b).*$/gim;

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	getResponse(): string {
		return 'Man, Sig really is the best.';
	}

	handleMessage(message: Message): void {
		if (message.author.bot) return;

		if (message.content.match(this.pattern)) {
			this.botName = message.author.displayName;
			this.avatarUrl = message.author.displayAvatarURL() ?? message.author.defaultAvatarURL;
			this.sendReply(message.channel as TextChannel, this.getResponse());
		}
	}
}
