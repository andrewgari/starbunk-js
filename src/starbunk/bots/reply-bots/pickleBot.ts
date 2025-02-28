import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
import { getSigCondition } from '../triggers/userConditions';

/**
 * PickleBot - A bot that responds to mentions of "gremlin" or to Sig's messages containing "gremlin"
 */
export default function createPickleBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Get the condition for checking if the message is from Sig
	const sigUserCondition = getSigCondition();

	// Combine the Sig user condition with the gremlin pattern condition
	const sigCondition = new OneCondition(
		sigUserCondition,
		new RandomChanceCondition(15)
	);

	// Use the webhook service passed as parameter instead of always using the imported singleton
	return new BotBuilder('PickleBot', webhookSvc)
		.withAvatar('https://i.imgur.com/D0czJFu.jpg')
		.withCustomTrigger(new AllConditions(
			new PatternCondition(Patterns.WORD_GREMLIN),
			sigCondition
		))
		.respondsWithStatic("Could you repeat that? I don't speak *gremlin*")
		.build();
}
