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
	disabled: true, // DISABLED
	respondsToBots: true, // Only respond to bot messages, not humans
	responseChance: BOT_BOT_RESPONSE_RATE, // 1% chance to respond
	triggers: [botTrigger],
});
