import { Message, TextChannel } from 'discord.js';
import userID from '../../../discord/userID';
import { Logger } from '../../../services/logger';
import { WebhookService } from '../../../webhooks/webhookService';
import { BotIdentity, CompositeTrigger, PatternTrigger, ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom response generator for MacaroniBot
class MacaroniResponseGenerator implements ResponseGenerator {
	constructor(private readonly logger = Logger) { }

	async generateResponse(message: Message): Promise<string> {
		const macaroniPattern = /\b(mac(aroni)?|pasta)\b/i;
		const vennPattern = /\bvenn\b/i;

		if (message.content.match(macaroniPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned macaroni/pasta: "${message.content}"`);
			return 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
		} else if (message.content.match(vennPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned Venn: "${message.content}"`);
			return `Are you trying to reach <@${userID.Venn}>`;
		}

		return '';
	}
}

export default class MacaroniBot extends ReplyBot {
	private readonly botName = 'Macaroni Bot';
	private readonly macaroniPattern = /\b(mac(aroni)?|pasta)\b/i;
	private readonly vennPattern = /\bvenn\b/i;
	private readonly macaroniResponse = 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
	private readonly avatarUrl = 'https://i.imgur.com/fgbH6Xf.jpg';

	constructor(webhookService: WebhookService, protected readonly logger = Logger) {
		const identity: BotIdentity = {
			name: 'Macaroni Bot',
			avatarUrl: 'https://i.imgur.com/fgbH6Xf.jpg'
		};

		const macaroniTrigger = new PatternTrigger(/\b(mac(aroni)?|pasta)\b/i);
		const vennTrigger = new PatternTrigger(/\bvenn\b/i);
		const trigger = new CompositeTrigger([macaroniTrigger, vennTrigger]);

		const responseGenerator = new MacaroniResponseGenerator(logger);

		super(identity, trigger, responseGenerator, webhookService);
	}

	getBotName(): string {
		return this.botName;
	}

	getAvatarUrl(): string {
		return this.avatarUrl;
	}

	async handleMessage(message: Message<boolean>): Promise<void> {
		if (message.author.bot) return;

		if (message.content.match(this.macaroniPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned macaroni/pasta: "${message.content}"`);
			await this.sendReply(message.channel as TextChannel, this.macaroniResponse);
		} else if (message.content.match(this.vennPattern)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned Venn: "${message.content}"`);
			await this.sendReply(message.channel as TextChannel, `Are you trying to reach <@${userID.Venn}>`);
		}
	}
}
