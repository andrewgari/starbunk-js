import { createStrategyBot } from '../../core/bot-builder';
import { PICKLE_BOT_AVATAR_URL, PICKLE_BOT_NAME } from './constants';
import { pickleTrigger } from './triggers';

// Create the Pickle Bot that responds to gremlin mentions
export default createStrategyBot({
	name: PICKLE_BOT_NAME,
	description: 'Responds to gremlin mentions with confusion',
	defaultIdentity: {
		botName: PICKLE_BOT_NAME,
		avatarUrl: PICKLE_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [pickleTrigger]
});
