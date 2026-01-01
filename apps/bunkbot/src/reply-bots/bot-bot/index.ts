import { BotFactory } from '../../core/bot-factory';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// Create the BotBot that responds to other bots
export default BotFactory.createBot({
	name: BOT_BOT_NAME,
	description: 'Responds to bot messages (except excluded bots) with a 1% chance',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL,
	},
	respondsToBots: true, // Only respond to bot messages, not humans
	responseChance: BOT_BOT_RESPONSE_RATE, // 1% chance to respond
	triggers: [botTrigger],
});
