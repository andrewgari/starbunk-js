import ReplyBot from '../../src/starbunk/bots/replyBot';
import { WebhookService } from '../../src/webhooks/webhookService';
import { RegexCondition } from '../conditions';

export function createExampleBot(webhookService: WebhookService): ReplyBot {
	return new ReplyBot(
		{
			name: 'Example Bot',
			avatarUrl: 'your_avatar_url_here'
		},
		new RegexCondition(/foo/i),
		{
			generateResponse: async () => 'Bar'
		},
		webhookService
	);
}
