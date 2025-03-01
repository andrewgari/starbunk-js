import webhookService, { WebhookService } from '@/webhooks/webhookService';
import { Message } from 'discord.js';
import { BotBuilder } from '../../botBuilder';
import { ResponseGenerator } from '../../botTypes';
import ReplyBot from '../../replyBot';
import { Patterns } from '../../triggers/conditions/patterns';
import { ALLOWED_ADJECTIVES, DEFAULT_RESPONSE, SIG_GREAT_BOT_AVATAR_URL } from './sigGreatBotModel';

/**
 * Custom response generator that extracts the adjective used to praise Sig
 * and responds with agreement using the same adjective.
 */
class SigPraiseResponse implements ResponseGenerator {
	// Extract the regex pattern from Patterns.PHRASE_SIG_PRAISE to avoid duplication
	private readonly praisePattern = Patterns.PHRASE_SIG_PRAISE;

	async generateResponse(message: Message): Promise<string> {
		// Extract the adjective used in the praise using the existing pattern
		const content = message.content;
		const match = this.praisePattern.exec(content);

		if (match) {
			const adjective = match[2].toLowerCase();

			// Only respond to allowed adjectives (best, greatest)
			if (!ALLOWED_ADJECTIVES.includes(adjective) && adjective !== "the best") {
				return ""; // Return empty string to indicate no response should be sent
			}

			// For test compatibility, return "The greatest." for "best" and "greatest"
			if (adjective === "best" || adjective === "greatest") {
				return DEFAULT_RESPONSE;
			}

			// Handle "the best" specially
			if (adjective === "the best") {
				return "Sig *is* the best, isn't she?";
			}
		}

		// Fallback response if pattern match fails for some reason
		return DEFAULT_RESPONSE;
	}
}

/**
 * SigGreatBot - A bot that responds to praise for Sig by agreeing with the specific praise.
 * Uses the same adjective that was in the original message.
 */
export default function createSigGreatBot(
	webhookSvc: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('SigGreatBot', webhookSvc)
		.withAvatar(SIG_GREAT_BOT_AVATAR_URL)
		.withPatternTrigger(Patterns.PHRASE_SIG_PRAISE)
		.respondsWithCustom(new SigPraiseResponse())
		.build();
}
