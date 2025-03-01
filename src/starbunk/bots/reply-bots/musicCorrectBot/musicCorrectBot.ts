import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { BotBuilder } from '../../botBuilder';
import ReplyBot from '../../replyBot';
import { PatternCondition } from '../../triggers/conditions/patternCondition';
import { Patterns } from '../../triggers/conditions/patterns';
import { MUSIC_CORRECT_BOT_AVATAR_URL, MUSIC_CORRECT_BOT_RESPONSE } from './musicCorrectBotModel';

export default function createMusicCorrectBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Use the webhook service passed as parameter instead of always using the imported singleton
	return new BotBuilder('Music Correct Bot', webhookSvc)
		.withAvatar(MUSIC_CORRECT_BOT_AVATAR_URL)
		.withCustomCondition(
			MUSIC_CORRECT_BOT_RESPONSE,
			MUSIC_CORRECT_BOT_AVATAR_URL,
			new PatternCondition(Patterns.COMMAND_MUSIC)
		)
		.build();
}
