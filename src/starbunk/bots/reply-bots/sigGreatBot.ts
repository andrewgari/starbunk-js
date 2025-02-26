import webhookService from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';

/**
 * SigGreatBot - A bot that responds to "Sig best" with "The greatest".
 */
export default function createSigGreatBot(): ReplyBot {
	return new BotBuilder('SigGreatBot', webhookService)
		.withAvatar('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png')
		.withPatternTrigger(/\bsig\s+(?:best|greatest)\b/i)
		.respondsWithStatic('The greatest.')
		.build();
}
