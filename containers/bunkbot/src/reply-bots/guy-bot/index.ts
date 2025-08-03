import { BotFactory } from '../../core/bot-factory';
import { GUY_BOT_AVATAR_URL, GUY_BOT_NAME } from './constants';
import { guyTrigger } from './triggers';

// Create the Guy Bot that responds to "guy" mentions
export default BotFactory.createBot({
	name: 'GuyBot',
	description: 'Responds to "guy" mentions with random meme responses',
	// Legacy fallback identity
	defaultIdentity: {
		botName: 'GuyBot',
		avatarUrl: GUY_BOT_AVATAR_URL
	},
	// New identity configuration system - Dynamic Identity Bot
	identityConfig: {
		type: 'dynamic',
		targetUsername: 'Guy' // Target user for identity resolution
	},
	skipBotMessages: true,
	triggers: [guyTrigger]
});
