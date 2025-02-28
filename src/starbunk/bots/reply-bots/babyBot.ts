import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createBabyBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('BabyBot', webhookSvc)
		.withAvatar('https://i.redd.it/qc9qus78dc581.jpg')
		.withCustomCondition(
			'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif',
			'https://i.redd.it/qc9qus78dc581.jpg',
			new PatternCondition(Patterns.WORD_BABY)
		)
		.build();
}
