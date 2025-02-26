import { Message } from 'discord.js';
import userID from '../../../discord/userID';
import { Logger } from '../../../services/logger';
import { formatUserMention } from '../../../utils/discordFormat';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

// Custom response generator for MacaroniBot
class MacaroniResponseGenerator implements ResponseGenerator {
	constructor(private readonly logger = Logger) { }

	async generateResponse(message: Message): Promise<string> {
		const macaroniCondition = new PatternCondition(Patterns.MACARONI);
		const vennCondition = new PatternCondition(Patterns.VENN_MENTION);

		if (await macaroniCondition.shouldTrigger(message)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned macaroni/pasta: "${message.content}"`);
			return 'Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum';
		} else if (await vennCondition.shouldTrigger(message)) {
			this.logger.debug(`MacaroniBot: ${message.author.username} mentioned Venn: "${message.content}"`);
			return `Are you trying to reach ${formatUserMention(userID.Venn)}`;
		}

		return '';
	}
}

export default function createMacaroniBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const macaroniCondition = new PatternCondition(Patterns.MACARONI);
	const vennCondition = new PatternCondition(Patterns.VENN_MENTION);
	const responseGenerator = new MacaroniResponseGenerator(Logger);

	return new BotBuilder('Macaroni Bot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/fgbH6Xf.jpg')
		.withCustomTrigger(macaroniCondition)
		.withCustomTrigger(vennCondition)
		.respondsWithCustom(responseGenerator)
		.build();
}
