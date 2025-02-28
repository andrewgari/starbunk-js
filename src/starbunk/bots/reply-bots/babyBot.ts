import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

export default function createBabyBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BabyBot', webhookService)
		.withAvatar('https://i.redd.it/qc9qus78dc581.jpg')
		.withPatternTrigger(Patterns.WORD_BABY)
		.respondsWithStatic('https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif')
		.build();
}
