import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createSpiderBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('Spider-Bot', webhookService)
		.withAvatar('https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg')
		.withCustomTrigger(new PatternCondition(Patterns.WORD_SPIDERMAN))
		.respondsWithStatic("Hey, it's \"**Spider-Man**\"! Don't forget the hyphen! Not Spiderman, that's dumb")
		.build();
}
