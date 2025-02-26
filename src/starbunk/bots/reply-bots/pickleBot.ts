import UserID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { createSimpleBot } from '../botFactory';
import ReplyBot from '../replyBot';

export default function createPickleBot(webhookService: WebhookService): ReplyBot {
	return createSimpleBot({
		name: 'GremlinBot',
		avatarUrl: 'https://i.imgur.com/D0czJFu.jpg',
		pattern: /gremlin/i,
		response: "Could you repeat that? I don't speak *gremlin*",
		randomUserTriggers: [{
			userId: UserID.Sig,
			chance: 15
		}]
	}, webhookService);
}
