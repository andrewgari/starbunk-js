import { BotFactory } from '../../core/bot-factory';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// Create the BotBot that responds to other bots
export default BotFactory.createBot({
	name: BOT_BOT_NAME,
	description: 'Responds to other bots with a 1% chance, skips non-bot messages',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL,
	},
	// Use 100% response rate since we handle chance in messageFilter
	defaultResponseRate: 100,

	// Custom message filter: inverted logic - skip non-bot messages, 1% chance on bot messages
	messageFilter: async (message) => {
		// Skip messages from non-bots (inverted logic)
		if (!message.author.bot) {
			return true; // Skip non-bot messages
		}

		// For bot messages, check if they should be excluded (like CovaBot)
		const { shouldExcludeFromReplyBots } = await import('../../core/conditions');
		if (shouldExcludeFromReplyBots(message)) {
			return true; // Skip excluded bot messages
		}

		// For non-excluded bot messages, apply 1% chance
		const randomChance = Math.random() * 100;
		if (randomChance > BOT_BOT_RESPONSE_RATE) {
			return true; // Skip due to chance (99% of the time)
		}

		// Don't skip - process this bot message (1% chance)
		return false;
	},

	triggers: [botTrigger],
});
