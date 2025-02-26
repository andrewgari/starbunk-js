import UserID from '../../../discord/userID';
import { WebhookService } from '../../../webhooks/webhookService';
import { CompositeTrigger, PatternTrigger, StaticResponse, UserRandomTrigger } from '../botTypes';
import ReplyBot from '../replyBot';

class GremlinBot extends ReplyBot {
	constructor(webhookService: WebhookService) {
		// Create the triggers
		const pattern = new PatternTrigger(/gremlin/i);
		const userRandom = new UserRandomTrigger(UserID.Sig, 15);
		const trigger = new CompositeTrigger([pattern, userRandom]);

		// Create the response generator
		const responseGenerator = new StaticResponse("Could you repeat that? I don't speak *gremlin*");

		super(
			{
				name: 'GremlinBot',
				avatarUrl: 'https://i.imgur.com/D0czJFu.jpg',
			},
			trigger,
			responseGenerator,
			webhookService
		);
	}

	getBotName(): string {
		return 'GremlinBot';
	}
}

// Export the GremlinBot class
export default GremlinBot;
