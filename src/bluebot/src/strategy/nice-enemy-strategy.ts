import { Message } from 'discord.js';
import { NiceStrategy } from '@/strategy/nice-strategy';
import { BlueBotDiscordService } from '@/discord/discord-service';
import { matchesAnyName } from '@/utils/string-similarity';

export class NiceEnemyStrategy extends NiceStrategy {
  async shouldRespond(message: Message): Promise<boolean> {
    const enemy = await BlueBotDiscordService.getInstance().getEnemy();
		const subject = this.getRequestedName(message);

    // Check if subject matches enemy's nickname or username using fuzzy matching
    if (matchesAnyName(subject, [enemy.nickname, enemy.user.username])) {
      return true;
    }

		return false;
  }

	getResponse(message: Message): Promise<string> {
		const userMentionRegex = /<@!?(\d+)>/;
    const mentionMatch = message.content.match(userMentionRegex);

		if (mentionMatch && mentionMatch[1]) {
			const userId = mentionMatch[1];
			if (userId === process.env.BLUEBOT_ENEMY_USER_ID) {
				return Promise.resolve('No way, they can suck my blue cane :unamused:');
			}
		}

		return Promise.reject('');
	}
}

