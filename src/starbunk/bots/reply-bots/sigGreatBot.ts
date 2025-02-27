import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * SigGreatBot - A bot that responds to "Sig best" with "The greatest".
 */
export default function createSigGreatBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('SigGreatBot', webhookServiceParam)
		.withAvatar('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png')
		.withPatternTrigger(Patterns.SIG_GREAT)
		.respondsWithStatic('The greatest.')
		.build();
}
