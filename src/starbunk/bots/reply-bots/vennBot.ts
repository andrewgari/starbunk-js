import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import random from '../../../utils/random';
import { WebhookService } from '../../../webhooks/webhookService';
import ReplyBot from '../replyBot';

export default class VennBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		super(webhookService);
	}
	private botName = 'VennBot';
	private avatarUrl = '';
	private readonly pattern = /\bcringe\b/i;
	private static readonly responses = [
		'Sorry, but that was über cringe...',
		'Geez, that was hella cringe...',
		'That was cringe to the max...',
		'What a cringe thing to say...',
		'Mondo cringe, man...',
		"Yo that was the cringiest thing I've ever heard...",
		'Your daily serving of cringe, milord...',
		'On a scale of one to cringe, that was pretty cringe...',
		'That was pretty cringe :airplane:',
		'Wow, like....cringe much?',
		'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
		'Like I always say, that was pretty cringe...',
		'C.R.I.N.G.E',
	];

	static getRandomResponse(): string {
		return this.responses[random.roll(this.responses.length)];
	}

	getResponse(): string {
		return VennBot.getRandomResponse();
	}

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (message.author.id == userID.Venn && (message.content.match(this.pattern) || random.percentChance(5))) {
			this.botName = message.author.displayName;
			this.avatarUrl = message.author.displayAvatarURL() ?? message.author.defaultAvatarURL;
			await this.sendReply(message.channel as TextChannel, this.getResponse());
		}
	}
}
