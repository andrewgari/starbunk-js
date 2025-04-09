import { BotFactory } from '../../core/bot-factory';
import { CHAD_BOT_AVATAR_URL, CHAD_BOT_NAME } from './constants';
import { chadKeywordTrigger } from './triggers';

// Create the Chad Bot with keyword trigger
export default BotFactory.createBot({
	name: 'Chad Bot',
	description: 'Responds to mentions of gym, protein, and other chad topics',
	defaultIdentity: {
		botName: CHAD_BOT_NAME,
		avatarUrl: CHAD_BOT_AVATAR_URL
	},
	// We don't want Chad to respond to other bots
	skipBotMessages: true,
	// Always process messages since we handle chance in the trigger
	defaultResponseRate: 100,
	// All triggers with their priorities
	triggers: [chadKeywordTrigger]
});
