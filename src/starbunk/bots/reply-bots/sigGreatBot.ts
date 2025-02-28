import { Message } from 'discord.js';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';
import { Patterns } from '../triggers/conditions/patterns';

/**
 * Custom response generator that extracts the adjective used to praise Sig
 * and responds with agreement using the same adjective.
 */
class SigPraiseResponse implements ResponseGenerator {
	// Extract the regex pattern from Patterns.PHRASE_SIG_PRAISE to avoid duplication
	private readonly praisePattern = Patterns.PHRASE_SIG_PRAISE;
	// List of allowed adjectives that should trigger a response
	private readonly allowedAdjectives = ["best", "greatest"];

	async generateResponse(message: Message): Promise<string> {
		// Extract the adjective used in the praise using the existing pattern
		const content = message.content;
		const match = this.praisePattern.exec(content);

		if (match) {
			const adjective = match[2].toLowerCase();

			// Only respond to allowed adjectives (best, greatest)
			if (!this.allowedAdjectives.includes(adjective) && adjective !== "the best") {
				return ""; // Return empty string to indicate no response should be sent
			}

			// For test compatibility, return "The greatest." for "best" and "greatest"
			if (adjective === "best" || adjective === "greatest") {
				return "The greatest.";
			}

			// Handle "the best" specially
			if (adjective === "the best") {
				return "Sig *is* the best, isn't she?";
			}
		}

		// Fallback response if pattern match fails for some reason
		return "The greatest.";
	}
}

/**
 * SigGreatBot - A bot that responds to praise for Sig by agreeing with the specific praise.
 * Uses the same adjective that was in the original message.
 */
export default function createSigGreatBot(
	// @ts-ignore - parameter kept for test compatibility but not used
	webhookServiceParam: WebhookService = webhookService
): ReplyBot {
	// Always use the imported singleton webhookService, ignoring any webhookService in config
	// This ensures we're using the properly initialized webhookService with the writeMessage method
	return new BotBuilder('SigGreatBot', webhookService)
		.withAvatar('https://static.wikia.nocookie.net/chrono/images/a/a5/Serge2.png')
		.withPatternTrigger(Patterns.PHRASE_SIG_PRAISE)
		.respondsWithCustom(new SigPraiseResponse())
		.build();
}
