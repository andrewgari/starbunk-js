import { createStrategyBot } from '../../core/bot-builder';
import { NICE_BOT_AVATAR_URL, NICE_BOT_NAME } from './constants';
import { niceTrigger } from './triggers';

// Create the Nice Bot that responds with "Nice." to specific numbers
export default createStrategyBot({
	name: NICE_BOT_NAME,
	description: 'Responds with "Nice." to specific numbers',
	defaultIdentity: {
		botName: NICE_BOT_NAME,
		avatarUrl: NICE_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [niceTrigger]
});
