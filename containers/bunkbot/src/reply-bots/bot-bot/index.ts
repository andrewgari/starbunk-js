import { BotFactory } from '../../core/bot-factory';
import { BOT_BOT_AVATAR_URL, BOT_BOT_NAME, BOT_BOT_RESPONSE_RATE } from './constants';
import { botTrigger } from './triggers';

// Create the BotBot that responds to other bots
export default BotFactory.createBot({
	name: BOT_BOT_NAME,
	description: 'Responds to any bot messages (except BunkBot self) with a 1% chance',
	defaultIdentity: {
		botName: BOT_BOT_NAME,
		avatarUrl: BOT_BOT_AVATAR_URL,
	},
	// Use 100% response rate since we handle chance in messageFilter
	defaultResponseRate: 100,

	// Custom message filter: skip non-bot messages, apply 1% chance to bot messages
	messageFilter: async (message) => {
		// Skip messages from non-bots
		if (!message.author.bot) {
			return true; // Skip non-bot messages
		}

		// Explicitly skip BotBot's own messages to prevent self-triggering loops
		if (message.client?.user && message.author.id === message.client.user.id) {
			return true;
		}

		// Use the shared exclusion logic (covers CovaBot and other excluded bots, and production webhooks)
		const { shouldExcludeFromReplyBots } = await import('../../core/conditions');
		if (shouldExcludeFromReplyBots(message)) {
			return true;
		}

		// For remaining bot messages, apply 1% chance
		const randomChance = Math.random() * 100;
		if (randomChance > BOT_BOT_RESPONSE_RATE) {
			return true; // Skip due to chance (99% of the time)
		}

		// Process this bot message (1% chance)
		return false;
	},

	triggers: [botTrigger],
});
