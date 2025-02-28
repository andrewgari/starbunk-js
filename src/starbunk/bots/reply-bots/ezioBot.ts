import { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createEzioBot(webhookService: WebhookService): ReplyBot {
	return new BotBuilder('Ezio Auditore Da Firenze', webhookService)
		.withAvatar('https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg')
		.withPatternTrigger(Patterns.WORD_ASSASSIN)
		.respondsWithStatic('Remember {username}, Nothing is true; Everything is permitted.')
		.build();
}
