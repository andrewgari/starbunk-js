import { createStrategyBot } from '../../core/bot-builder';
import { CHAD_AVATAR_URL, CHAD_BOT_NAME } from './constants';
import { chadPhraseTrigger, chadRandomTrigger, chadWordTrigger } from './triggers';

// Create the Chad Bot with all its triggers
export default createStrategyBot({
	name: 'ChadBot',
	description: 'Responds with gym bro / sigma male comments',
	// Default identity
	defaultIdentity: {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_AVATAR_URL
	},
	// We don't want to skip bot messages to allow Chad to react to other bots
	skipBotMessages: false,
	// All triggers with their priorities
	triggers: [
		chadPhraseTrigger,   // Highest priority - specific phrases
		chadWordTrigger,     // Medium priority - regex matches 
		chadRandomTrigger    // Lowest priority - random chance
	]
});
