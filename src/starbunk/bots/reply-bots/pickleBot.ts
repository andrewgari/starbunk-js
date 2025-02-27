import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';

/**
 * GremlinBot - A bot that responds to mentions of "gremlin" or randomly to Sig
 */
export default function createPickleBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	return new BotBuilder('PickleBot', webhookServiceParam)
		.withAvatar('https://i.imgur.com/D0czJFu.jpg')
		.withCustomTrigger(new OneCondition(
			new PatternCondition(Patterns.GREMLIN),
			new RandomChanceCondition(15)
		))
		.respondsWithStatic("Could you repeat that? I don't speak *gremlin*")
		.build();
}
