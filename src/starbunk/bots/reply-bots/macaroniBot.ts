import userID from '../../../discord/userID';
import { formatUserMention } from '../../../utils/discordFormat';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * MacaroniBot - A bot that responds to mentions of "macaroni" and "venn"
 *
 * This bot has two distinct behaviors:
 * 1. When someone mentions "venn", it corrects them with the full name
 * 2. When someone mentions "macaroni", it responds with a user mention
 */
export default function createMacaroniBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Create a bot that responds to both patterns
	const avatarUrl = 'https://i.imgur.com/Jx5v7bZ.png';
	const builder = new BotBuilder('Macaroni Bot', webhookSvc)
		.withAvatar(avatarUrl)
		// IMPORTANT: Enable multi-response mode BEFORE adding the patterns
		.withMultipleResponses(true);

	// First add the VENN_MENTION pattern
	builder.withCustomCondition(
		"Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum",
		avatarUrl,
		new PatternCondition(Patterns.WORD_VENN)
	);

	// Then add the MACARONI pattern
	builder.withCustomCondition(
		`Are you trying to reach ${formatUserMention(userID.Venn)}`,
		avatarUrl,
		new PatternCondition(Patterns.WORD_MACARONI)
	);

	return builder.build();
}
