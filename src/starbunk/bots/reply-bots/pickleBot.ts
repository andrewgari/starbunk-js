import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RandomChanceCondition } from '../triggers/conditions/randomChanceCondition';
import { getSigCondition } from '../triggers/userConditions';

/**
 * PickleBot - A bot that responds to mentions of "gremlin" or to Sig's messages containing "gremlin"
 */
export default function createPickleBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Get the condition for checking if the message is from Sig
	const sigUserCondition = getSigCondition();

	// Combine the Sig user condition with the gremlin pattern condition
	const sigCondition = new OneCondition(
		sigUserCondition,
		new RandomChanceCondition(15)
	);

	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('PickleBot', webhookService)
		.withAvatar('https://i.imgur.com/D0czJFu.jpg')
		.withCustomTrigger(new OneCondition(
			new PatternCondition(Patterns.WORD_GREMLIN),
			sigCondition
		))
		.respondsWithStatic("Could you repeat that? I don't speak *gremlin*")
		.build();
}
