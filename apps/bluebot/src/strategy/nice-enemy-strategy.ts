import { Message } from 'discord.js';
import { NiceStrategy } from './nice-strategy';

export class NiceEnemyStrategy extends NiceStrategy {
	getResponse(message: Message): Promise<string> {
		if (message.author.id === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve('No way, they can suck my blue cane :unamused:');
		}

		return Promise.reject('');
	}
}

