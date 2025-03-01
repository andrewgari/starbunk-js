import { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { Patterns } from '../../triggers/conditions/patterns';
import { EZIO_BOT_AVATAR_URL, EZIO_BOT_NAME, EZIO_BOT_RESPONSE } from './ezioBotModel';

export default function createEzioBot(webhookService: WebhookService): ReplyBot {
	return new BotBuilder(EZIO_BOT_NAME, webhookService)
		.withAvatar(EZIO_BOT_AVATAR_URL)
		.withPatternTrigger(Patterns.WORD_ASSASSIN)
		.respondsWithStatic(EZIO_BOT_RESPONSE)
		.build();
}
