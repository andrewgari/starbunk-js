import { WebhookService } from '../../../webhooks/webhookService';
import { createSimpleBot } from '../botFactory';
import ReplyBot from '../replyBot';

export default function createSigGreatBot(webhookService: WebhookService): ReplyBot {
	return createSimpleBot({
		name: 'SigBestBot',
		avatarUrl: '',
		pattern: /\b(sig|siggles) is best\b/i,
		response: 'Man, Sig really is the best.'
	}, webhookService);
}
