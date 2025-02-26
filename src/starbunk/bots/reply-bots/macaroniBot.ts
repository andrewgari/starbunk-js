import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { Logger } from '../../../services/logger';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
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

export default function createMacaroniBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const macaroniPattern = /\b(mac(aroni)?|pasta)\b/i;
	const vennPattern = /\bvenn\b/i;
	const responseGenerator = new MacaroniResponseGenerator(Logger);

	return new BotBuilder('Macaroni Bot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/fgbH6Xf.jpg')
		.withPatternTrigger(macaroniPattern)
		.withPatternTrigger(vennPattern)
		.respondsWithCustom(responseGenerator)
		.build();
}
