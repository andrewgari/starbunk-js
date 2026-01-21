import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';

export class ConfirmStrategy implements Strategy {
	private confirmPhrases = [
    /blue/i,
    /blue?bot/i,
		/\b(blue?bot|bot)\b/i,
		/\b(yes|yep|yeah|yup|sure)\b/i,
		/\b(no|nope|nah)\b/i,
		/\bi did(n't| not)?\b/i,
		/\byou got it\b/i,
		/\bsure did\b/i,
    /stupid/i,
	];

	async shouldRespond(message: Message): Promise<boolean> {
		// Check if it's a reply to the bot
		const isReplyToBot = message.reference?.messageId !== undefined;

		// Confirmations are usually short
		const isShortMessage = message.content.trim().split(/\s+/).length <= 5;

		const matchesPhrase = this.confirmPhrases.some(regex => regex.test(message.content));

		// Respond if it matches AND (is a reply OR is short)
		return Promise.resolve(matchesPhrase && (isReplyToBot || isShortMessage));
	}

	async getResponse(): Promise<string> {
		return Promise.resolve('Somebody definitely said Blu!');
	}
}

