import UserID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * GremlinBot - A bot that responds to mentions of "gremlin" or randomly to Sig
 */
export default function createGremlinBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('GremlinBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/D0czJFu.jpg')
		.withPatternTrigger(/gremlin/i)
		.withUserRandomTrigger(UserID.Sig, 15)
		.respondsWithStatic("Could you repeat that? I don't speak *gremlin*")
		.build();
}
