import { Message } from 'discord.js';
import { BlueStrategy } from '@/strategy/blue-strategy';

export class DefaultStrategy implements BlueStrategy {
	private blueRegex = /\b(blue?|blue?bot|bl(o+)|azul|blau|bl(u+)|blew)\b/i;

	shouldRespond(message: Message): Promise<boolean> {
		if (this.blueRegex.test(message.content)) {
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	}

	getResponse(_message: Message): Promise<string> {
		return Promise.resolve('Did somebody say Blu?');
	}
}

