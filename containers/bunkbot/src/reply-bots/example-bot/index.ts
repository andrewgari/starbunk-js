import { BotFactory } from '../../core/bot-factory';
import { createTriggerResponse } from '../../core/trigger-response';

export default BotFactory.createBot({
	name: 'ExampleBot',
	description: 'An example bot with custom message filtering',
	defaultIdentity: {
		botName: 'ExampleBot',
		avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png'
	},
	triggers: [
		createTriggerResponse({
			name: 'example-trigger',
			condition: (message: any) => {
				const content = message.content.toLowerCase();
				return /\bexample\b/i.test(content) || /\bsimple\b/i.test(content);
			},
			response: () => {
				return 'This is an example response with custom filtering!';
			},
			priority: 1
		})
	],
	responseRate: 100,
	
	// Example of custom message filtering
	// This bot defines its own complete filtering logic
	messageFilter: async (message) => {
		// Skip messages from bots (except non-excluded ones)
		if (message.author.bot) {
			const { shouldExcludeFromReplyBots } = await import('../../core/conditions');
			if (shouldExcludeFromReplyBots(message)) {
				return true; // Skip excluded bots
			}
		}
		
		// Skip messages that are too short (less than 3 characters)
		if (message.content.trim().length < 3) {
			return true;
		}
		
		// Skip messages that contain spam keywords
		const spamWords = ['spam', 'advertisement', 'buy now'];
		const content = message.content.toLowerCase();
		if (spamWords.some(word => content.includes(word))) {
			return true;
		}
		
		// Don't skip otherwise
		return false;
	}
});
