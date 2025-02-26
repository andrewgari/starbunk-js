import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';

// Custom response generator for CheckBot
class CheckBotResponseGenerator implements ResponseGenerator {
	private readonly czechPattern = /\bczech\b/i;
	private readonly chezhPattern = /\bchezh\b/i;
	private readonly czechResponse = "I believe you mean 'check'.";
	private readonly chezhResponse = "I believe you mean 'czech'.";

	async generateResponse(message: Message): Promise<string> {
		if (message.content.match(this.czechPattern)) {
			return this.czechResponse;
		} else if (message.content.match(this.chezhPattern)) {
			return this.chezhResponse;
		}
		return '';
	}
}

export default function createCheckBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const czechPattern = /\bczech\b/i;
	const chezhPattern = /\bchezh\b/i;
	const responseGenerator = new CheckBotResponseGenerator();

	return new BotBuilder('CheckBot', webhookServiceParam)
		.withAvatar('https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg')
		.withPatternTrigger(czechPattern)
		.withPatternTrigger(chezhPattern)
		.respondsWithCustom(responseGenerator)
		.build();
}
