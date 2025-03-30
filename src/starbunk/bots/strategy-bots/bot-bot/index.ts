import { createStrategyBot } from '../../core/bot-builder';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// Create the Bot Bot that responds to other bots
export default createStrategyBot({
	name: BOT_BOT_NAME,
	description: 'Responds to other bots with a 5% chance',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL
	},
	// Don't skip bot messages since this bot specifically responds to bots
	skipBotMessages: false,
	responseRate: BOT_BOT_RESPONSE_RATE,
	triggers: [botTrigger]
});
