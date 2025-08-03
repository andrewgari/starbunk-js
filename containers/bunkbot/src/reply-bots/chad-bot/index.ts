import { BotFactory } from '../../core/bot-factory';
import { CHAD_BOT_AVATAR_URL, CHAD_BOT_NAME } from './constants';
import { chadKeywordTrigger } from './triggers';

// Create the Chad Bot with keyword trigger
export default BotFactory.createBot({
	name: 'ChadBot', // Updated to match the actual bot name
	description: 'Responds to mentions of gym, protein, and other chad topics',
	// Legacy fallback identity
	defaultIdentity: {
		botName: 'ChadBot',
		avatarUrl: CHAD_BOT_AVATAR_URL
	},
	// New identity configuration system - Dynamic Identity Bot
	identityConfig: {
		type: 'dynamic',
		targetUsername: 'Chad' // Target user for identity resolution
	},
	// Always process messages since we handle chance in the trigger
	defaultResponseRate: 100,
	// All triggers with their priorities
	triggers: [chadKeywordTrigger]
});
