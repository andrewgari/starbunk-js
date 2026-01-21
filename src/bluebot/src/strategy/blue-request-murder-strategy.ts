import { Message } from 'discord.js';
import { NiceStrategy as RequestStrategy } from '@/strategy/blue-request-nice-strategy';
import { BlueBotDiscordService } from '@/discord/discord-service';
import { matchesAnyName } from '@/utils/string-similarity';

export class RequestEnemyStrategy extends RequestStrategy {
  async shouldRespond(message: Message): Promise<boolean> {
    const enemy = await BlueBotDiscordService.getInstance().getEnemy();
		const subject = this.getRequestedName(message);

    // Check if subject is a user mention matching the enemy
    const userMentionRegex = /<@!?(\d+)>/;
    const mentionMatch = subject?.match(userMentionRegex);
    if (mentionMatch && mentionMatch[1] === process.env.BLUEBOT_ENEMY_USER_ID) {
      return true;
    }

    // Check if subject matches enemy's nickname or username using fuzzy matching
    if (matchesAnyName(subject, [enemy.nickname, enemy.user.username])) {
      return true;
    }

		return false;
  }

	async getResponse(message: Message): Promise<string> {
		const subject = this.getRequestedName(message);

		// Check if subject is a user mention matching the enemy
		const userMentionRegex = /<@!?(\d+)>/;
    const mentionMatch = subject?.match(userMentionRegex);
		if (mentionMatch && mentionMatch[1] === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve('No way, they can suck my blue cane :unamused:');
		}

		// Check if subject matches enemy's nickname or username using fuzzy matching
		const enemy = await BlueBotDiscordService.getInstance().getEnemy();
		if (matchesAnyName(subject, [enemy.nickname, enemy.user.username])) {
			return Promise.resolve('No way, they can suck my blue cane :unamused:');
		}

		return Promise.reject('');
	}
}

