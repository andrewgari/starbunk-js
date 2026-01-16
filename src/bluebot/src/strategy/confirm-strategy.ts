import { Message } from 'discord.js';
import { Strategy } from '@/strategy/strategy';

export class ConfirmStrategy implements Strategy {
	private confirmRegex = /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|nope|nah|(i did)|(i did not)|(you got it)|(sure did)\b/i;

	async shouldRespond(message: Message): Promise<boolean> {
		if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve(false);
		}

		if (this.confirmRegex.test(message.content)) {
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
	}

	async getResponse(): Promise<string> {
		return Promise.resolve('Somebody definitely said Blu!');
	}
}

