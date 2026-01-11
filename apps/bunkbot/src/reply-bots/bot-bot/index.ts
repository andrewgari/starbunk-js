import { BotFactory } from '../../core/bot-factory';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// BotBot is DISABLED - simplified bot detection no longer supports bot-to-bot interactions
export default BotFactory.createBot({
	name: BOT_BOT_NAME,
	description: 'DISABLED - Responds to bot messages (except excluded bots) with a 1% chance',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL,
	},
	disabled: true, // DISABLED - Bot-to-bot interactions are disabled
	respondsToBots: false, // Bot-to-bot interactions are disabled
	triggers: [botTrigger],
});
