import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createMusicCorrectBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Use the webhook service passed as parameter instead of always using the imported singleton
	const avatarUrl = 'https://i.imgur.com/v9XsyNc.png';
	return new BotBuilder('Music Correct Bot', webhookSvc)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			"Hey! The play command has changed. Use '/play' instead! 🎵",
			avatarUrl,
			new PatternCondition(Patterns.COMMAND_MUSIC)
		)
		.build();
}
