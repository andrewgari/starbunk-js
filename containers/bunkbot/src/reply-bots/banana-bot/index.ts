import { BotFactory } from '../../core/bot-factory';
import { BANANA_BOT_AVATAR_URL, BANANA_BOT_NAME } from './constants';
import { bananaTrigger } from './triggers';

// Create the Banana Bot that responds to banana mentions
export default BotFactory.createBot({
	name: BANANA_BOT_NAME,
	description: 'Responds to banana mentions with random banana-related messages',
	// New identity configuration system - Static Identity Bot
	identityConfig: {
		type: 'static',
		identity: {
			botName: BANANA_BOT_NAME,
			avatarUrl: BANANA_BOT_AVATAR_URL
		}
	},
	// Legacy fallback identity
	defaultIdentity: {
		botName: BANANA_BOT_NAME,
		avatarUrl: BANANA_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [bananaTrigger]
});
