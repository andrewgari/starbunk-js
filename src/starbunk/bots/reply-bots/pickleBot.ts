import UserID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * GremlinBot - A bot that responds to mentions of "gremlin" or randomly to Sig
 */
export default function createGremlinBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const gremlinCondition = new PatternCondition(Patterns.GREMLIN);

	return new BotBuilder('GremlinBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/D0czJFu.jpg')
		.withCustomTrigger(gremlinCondition)
		.withUserRandomTrigger(UserID.Sig, 15)
		.respondsWithStatic("Could you repeat that? I don't speak *gremlin*")
		.build();
}
