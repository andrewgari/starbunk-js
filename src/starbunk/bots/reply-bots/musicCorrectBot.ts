import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

export default function createMusicCorrectBot(
	/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
	_webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	const avatarUrl = 'https://i.imgur.com/v9XsyNc.png';
	return new BotBuilder('MusicBot', webhookService)
		.withAvatar(avatarUrl)
		.withCustomCondition(
			"Hey! The play command has changed. Use '/play' instead! 🎵",
			avatarUrl,
			new PatternCondition(Patterns.COMMAND_MUSIC)
		)
		.build();
}
