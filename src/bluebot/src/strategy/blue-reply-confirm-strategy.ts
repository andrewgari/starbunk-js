import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';

export class ReplyConfirmStrategy implements BlueStrategy {
	private confirmPhrases = [
    /blue/i,
    /blue?bot/i,
		/\b(blue?bot|bot)\b/i,
		/\b(yes|yep|yeah|yup|sure)\b/i,
		/\b(no|nope|nah)\b/i,
		/\bi did(n't| not)?\b/i,
		/\byou got it\b/i,
		/\bsure did\b/i,
    /\bstupid\b/i,
	];

	async shouldRespond(message: Message): Promise<boolean> {
		// Check if it's a reply to the bot
		if (message.reference?.messageId) {
			return Promise.resolve(true);
		}

		// Confirmations are usually short
		if (message.content.trim().split(/\s+/).length <= 5) {
      return Promise.resolve(true);
    }

		if (this.confirmPhrases.some(regex => regex.test(message.content))) {
			return Promise.resolve(true);
		}

    return Promise.resolve(false);
	}

	async getResponse(): Promise<string> {
		return Promise.resolve('Somebody definitely said Blu!');
	}
}

