import { Message } from 'discord.js';
import { ReplyConfirmStrategy } from '@/strategy/blue-reply-confirm-strategy';
import { logger } from '@/observability/logger';

export const MURDER_RESPONSE = `What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Blue Mages, and I've been involved in numerous secret raids on The Carnival, and I have over 300 confirmed spells. I am trained in primal warfare and I'm the top spell slinger in the entire FFXIV armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on Eorzea, mark my fucking words. You think you can get away with saying that shit to me over the Discord? Think again, fucker. As we speak I am contacting my secret network of Masked Carnivale Mages across Eorzea and your character ID is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare cane. Not only am I extensively trained in blue magic combat, but I have access to the entire arsenal of the Eorzean Blue Magic League and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little "clever" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo.`;

export class ConfirmEnemyStrategy extends ReplyConfirmStrategy {
	private meanRegex = /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i;

	async shouldRespond(message: Message): Promise<boolean> {
		const isEnemy = message.author.id === process.env.BLUEBOT_ENEMY_USER_ID;
		const matchedWord = message.content.match(this.meanRegex)?.[0];
		const hasMeanWord = !!matchedWord;

		logger.withMetadata({
			strategy_name: 'ConfirmEnemyStrategy',
			is_enemy: isEnemy,
			enemy_user_id: process.env.BLUEBOT_ENEMY_USER_ID,
			author_id: message.author.id,
			has_mean_word: hasMeanWord,
			matched_word: matchedWord,
			message_content: message.content,
			message_id: message.id,
		}).debug('ConfirmEnemyStrategy: Evaluating enemy murder trigger');

		if (!isEnemy) {
			logger.withMetadata({
				strategy_name: 'ConfirmEnemyStrategy',
				author_id: message.author.id,
				message_id: message.id,
			}).debug('ConfirmEnemyStrategy: Not enemy - no match');
			return false;
		}

		if (hasMeanWord) {
			logger.withMetadata({
				strategy_name: 'ConfirmEnemyStrategy',
				matched_word: matchedWord,
				message_id: message.id,
			}).warn('ConfirmEnemyStrategy: MURDER MODE ACTIVATED - Enemy used mean word!');
			return true;
		}

		logger.withMetadata({
			strategy_name: 'ConfirmEnemyStrategy',
			message_id: message.id,
		}).debug('ConfirmEnemyStrategy: Enemy but no mean word - no match');

		return false;
	}

	getResponse(_message: Message): Promise<string> {
		logger.withMetadata({
			strategy_name: 'ConfirmEnemyStrategy',
			response_length: MURDER_RESPONSE.length,
			message_id: _message.id,
		}).warn('ConfirmEnemyStrategy: Generating MURDER response');
		return Promise.resolve(MURDER_RESPONSE);
	}
}
