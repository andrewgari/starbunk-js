import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { PatternCondition, Patterns } from '../conditions';
import ReplyBot from '../replyBot';

export default function createMusicCorrectBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {
	const musicCommandCondition = new PatternCondition(Patterns.MUSIC_COMMAND);

	return new BotBuilder('Music Correct Bot', webhookServiceParam)
		.withCustomTrigger(musicCommandCondition)
		.respondsWithStatic("Hey! The play command has changed. Use '/play' instead! 🎵")
		.build();
}
