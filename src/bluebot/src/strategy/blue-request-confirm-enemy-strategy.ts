import { Message } from 'discord.js';
import { RequestConfirmStrategy } from '@/strategy/blue-request-confirm-strategy';
import { BlueBotDiscordService } from '@/discord/discord-service';
import { matchesAnyName } from '@/utils/string-similarity';
import { logger } from '@/observability/logger';

export class RequestConfirmEnemyStrategy extends RequestConfirmStrategy {
  async shouldRespond(message: Message): Promise<boolean> {
    const enemy = await BlueBotDiscordService.getInstance().getEnemy(message);
		const subject = this.getRequestedName(message);

		logger.withMetadata({
			strategy_name: 'RequestConfirmEnemyStrategy',
			subject,
			enemy_id: process.env.BLUEBOT_ENEMY_USER_ID,
			enemy_nickname: enemy.nickname,
			enemy_username: enemy.user.username,
			message_id: message.id,
		}).debug('RequestConfirmEnemyStrategy: Checking if request is about enemy');

    // Check if subject is a user mention matching the enemy
    const userMentionRegex = /<@!?(\d+)>/;
    const mentionMatch = subject?.match(userMentionRegex);
    if (mentionMatch && mentionMatch[1] === process.env.BLUEBOT_ENEMY_USER_ID) {
			logger.withMetadata({
				strategy_name: 'RequestConfirmEnemyStrategy',
				match_type: 'user_mention',
				subject,
				enemy_id: process.env.BLUEBOT_ENEMY_USER_ID,
				message_id: message.id,
			}).info('RequestConfirmEnemyStrategy: Matched - request about enemy via mention');
      return true;
    }

    // Check if subject matches enemy's nickname or username using fuzzy matching
		const nameMatches = matchesAnyName(subject, [enemy.nickname, enemy.user.username]);
    if (nameMatches) {
			logger.withMetadata({
				strategy_name: 'RequestConfirmEnemyStrategy',
				match_type: 'name_match',
				subject,
				enemy_nickname: enemy.nickname,
				enemy_username: enemy.user.username,
				message_id: message.id,
			}).info('RequestConfirmEnemyStrategy: Matched - request about enemy via name');
      return true;
    }

		logger.withMetadata({
			strategy_name: 'RequestConfirmEnemyStrategy',
			subject,
			message_id: message.id,
		}).debug('RequestConfirmEnemyStrategy: No match - not about enemy');

		return false;
  }

	async getResponse(message: Message): Promise<string> {
		const subject = this.getRequestedName(message);
		const response = 'No way, they can suck my blue cane :unamused:';

		logger.withMetadata({
			strategy_name: 'RequestConfirmEnemyStrategy',
			subject,
			response,
			message_id: message.id,
		}).warn('RequestConfirmEnemyStrategy: Generating insult response for enemy');

		// Check if subject is a user mention matching the enemy
		const userMentionRegex = /<@!?(\d+)>/;
    const mentionMatch = subject?.match(userMentionRegex);
		if (mentionMatch && mentionMatch[1] === process.env.BLUEBOT_ENEMY_USER_ID) {
			return Promise.resolve(response);
		}

		// Check if subject matches enemy's nickname or username using fuzzy matching
		const enemy = await BlueBotDiscordService.getInstance().getEnemy();
		if (matchesAnyName(subject, [enemy.nickname, enemy.user.username])) {
			return Promise.resolve(response);
		}

		logger.withMetadata({
			strategy_name: 'RequestConfirmEnemyStrategy',
			subject,
			message_id: message.id,
		}).error('RequestConfirmEnemyStrategy: getResponse called but no match found');

		return Promise.reject('');
	}
}

