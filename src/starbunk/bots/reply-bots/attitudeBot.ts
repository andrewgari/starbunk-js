import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * AttitudeBot - A bot that responds to negative attitude messages with "Not with THAT attitude!!!"
 *
 * This bot detects phrases like "I can't", "you can't", "they can't", or "we can't"
 * and responds with an encouraging (if somewhat sassy) message.
 *
 * @param webhookSvc - The webhook service to use for sending messages
 * @returns A configured ReplyBot instance
 */
export default function createAttitudeBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the webhook service passed as parameter
	return new BotBuilder('Xander Crews', webhookSvc)
		.withAvatar('https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg')
		.withPatternTrigger(Patterns.PHRASE_NEGATIVE_ATTITUDE)
		.respondsWithStatic("Not with THAT attitude!!!")
		.build();
}
