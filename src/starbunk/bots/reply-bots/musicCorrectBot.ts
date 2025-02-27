import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';
export default function createMusicCorrectBot(webhookServiceParam: WebhookService = webhookService): ReplyBot {

	return new BotBuilder('Music Correct Bot', webhookServiceParam)
		.withPatternTrigger(Patterns.MUSIC_COMMAND)
		.respondsWithStatic("Hey! The play command has changed. Use '/play' instead! 🎵")
		.build();
}
