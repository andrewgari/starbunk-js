import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

/**
 * SigGreatBot - A bot that responds to "Sig best" with "The greatest".
 */
export default function createSigGreatBot(): ReplyBot {
	const sigGreatCondition = new PatternCondition(Patterns.SIG_GREAT);

	return new BotBuilder('SigGreatBot', webhookService)
		.withAvatar('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png')
		.withCustomTrigger(sigGreatCondition)
		.respondsWithStatic('The greatest.')
		.build();
}
