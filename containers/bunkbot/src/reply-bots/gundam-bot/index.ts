import { BotFactory } from '../../core/bot-factory';
import { GUNDAM_BOT_AVATAR_URL, GUNDAM_BOT_NAME } from './constants';
import { gundamTrigger } from './triggers';

// Create the Gundam Bot that responds to Gundam mentions
export default BotFactory.createBot({
	name: GUNDAM_BOT_NAME,
	description: 'Responds to Gundam mentions with a joke about pronunciation',
	defaultIdentity: {
		botName: GUNDAM_BOT_NAME,
		avatarUrl: GUNDAM_BOT_AVATAR_URL
	},

	triggers: [gundamTrigger]
});
