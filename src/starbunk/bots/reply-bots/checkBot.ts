import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

// Custom response generator for CheckBot
class CheckBotResponseGenerator implements ResponseGenerator {
	private readonly czechResponse = "I believe you mean 'check'.";
	private readonly chezhResponse = "I believe you mean 'czech'.";

	async generateResponse(message: Message): Promise<string> {
		const czechCondition = new PatternCondition(Patterns.CZECH);
		const chezhCondition = new PatternCondition(Patterns.CHEZH);

		if (await czechCondition.shouldTrigger(message)) {
			return this.czechResponse;
		} else if (await chezhCondition.shouldTrigger(message)) {
			return this.chezhResponse;
		}
		return '';
	}
}

export default function createCheckBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const czechCondition = new PatternCondition(Patterns.CZECH);
	const chezhCondition = new PatternCondition(Patterns.CHEZH);
	const responseGenerator = new CheckBotResponseGenerator();

	return new BotBuilder('CheckBot', webhookServiceParam)
		.withAvatar('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg')
		.withCustomTrigger(czechCondition)
		.withCustomTrigger(chezhCondition)
		.respondsWithCustom(responseGenerator)
		.build();
}
