import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import { ResponseGenerator } from '../../botTypes';
import ReplyBot from '../../replyBot';
import { Patterns } from '../../triggers/conditions/patterns';

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
export default function createSheeshBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	const responseGenerator = new SheeshResponseGenerator();

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('SheeshBot', webhookSvc)
		.withAvatar('https://i.kym-cdn.com/photos/images/newsfeed/002/297/355/cb3')
		.withPatternTrigger(Patterns.WORD_SHEESH)
		.respondsWithCustom(responseGenerator)
		.build();
}
