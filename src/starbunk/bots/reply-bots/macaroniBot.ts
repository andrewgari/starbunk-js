import userID from '../../../discord/userID';
import { formatUserMention } from '../../../utils/discordFormat';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * MacaroniBot - A bot that responds to mentions of "macaroni" and "venn"
 *
 * This bot has two distinct behaviors:
 * 1. When someone mentions "venn", it corrects them with the full name
 * 2. When someone mentions "macaroni", it responds with a user mention
 */
export default function createMacaroniBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Create a bot that responds to both patterns
	const builder = new BotBuilder('Macaroni Bot', webhookService)
		.withAvatar('https://i.imgur.com/Jx5v7bZ.png')
		// IMPORTANT: Enable multi-response mode BEFORE adding the patterns
		.withMultipleResponses(true);

	// First add the VENN_MENTION pattern
	builder.withPatternTrigger(Patterns.WORD_VENN)
		.respondsWithStatic("Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum");

	// Then add the MACARONI pattern
	builder.withPatternTrigger(Patterns.WORD_MACARONI)
		.respondsWithStatic(`Are you trying to reach ${formatUserMention(userID.Venn)}`);

	return builder.build();
}
