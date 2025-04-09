import { BotFactory } from '../../core/bot-factory';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// Create the Bot Bot that responds to other bots
export default BotFactory.createBot({
	name: BOT_BOT_NAME,
	description: 'Responds to other bots with a 5% chance',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL
	},
	// Set bot-specific default response rate
	defaultResponseRate: BOT_BOT_RESPONSE_RATE,
	triggers: [botTrigger]
});
