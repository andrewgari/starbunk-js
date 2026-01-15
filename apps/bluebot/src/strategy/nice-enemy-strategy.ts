import { Message } from 'discord.js';
import { NiceStrategy } from '@/strategy/nice-strategy';

export class NiceEnemyStrategy extends NiceStrategy {
  shouldRespond(message: Message): Promise<boolean> {
		const match = message.content.match(this.niceRegex);
		if (match) {
			return Promise.resolve(true);
		}

		return Promise.resolve(false);
  }

	getResponse(message: Message): Promise<string> {
    let userId = '';
    const match = message.content.match(this.niceRegex);
		if (match && match.length > 1) {
			userId = match[1];
		}

    if (userId === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve('No way, they can suck my blue cane :unamused:');
		}

		return Promise.reject('');
	}
}

