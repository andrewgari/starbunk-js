import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

// Custom response generator for random sheesh lengths
class SheeshResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Generate a sheesh with random number of 'e's
		const eeCount = Math.floor(Math.random() * 15) + 3;
		const response = `Sh${'e'.repeat(eeCount)}sh`;
		return response;
	}
}

/**
 * SheeshBot - A bot that responds to "sheesh" with a sheesh of random length
 */
export default function createSheeshBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const sheeshCondition = new PatternCondition(Patterns.SHEESH);
	const responseGenerator = new SheeshResponseGenerator();

	return new BotBuilder('SheeshBot', webhookServiceParam)
		.withAvatar('https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3')
		.withCustomTrigger(sheeshCondition)
		.respondsWithCustom(responseGenerator)
		.build();
}
