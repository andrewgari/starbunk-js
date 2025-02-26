import { WebhookService } from '../../../webhooks/webhookService';
import { PatternTrigger, StaticResponse } from '../botTypes';
import ReplyBot from '../replyBot';

class SigBestBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		const trigger = new PatternTrigger(/\b(sig|siggles) is best\b/i);
		const responseGenerator = new StaticResponse('Man, Sig really is the best.');

		super(
			{
				name: 'SigBestBot',
				avatarUrl: '',
			},
			trigger,
			responseGenerator,
			webhookService
		);
	}

	getBotName(): string {
		return 'SigBestBot';
	}
}

// Export the SigBestBot class
export default SigBestBot;
