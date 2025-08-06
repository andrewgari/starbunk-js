import { BotFactory } from '../../core/bot-factory';
import { createTriggerResponse } from '../../core/trigger-response';
import { Message } from 'discord.js';
import { shouldExcludeFromReplyBots } from '../../core/conditions';

// Define spam words once for better performance
const SPAM_WORDS = ['spam', 'advertisement', 'buy now'];

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
			condition: (message: Message) => {
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
	messageFilter: (message) => {
		// Process message content once for better performance
		const content = message.content;
		const trimmedContent = content.trim();
		
		// Skip messages that are too short (less than 3 characters)
		if (trimmedContent.length < 3) {
			return true;
		}
		
		// Skip messages from bots (except non-excluded ones)
		if (message.author.bot && shouldExcludeFromReplyBots(message)) {
			return true; // Skip excluded bots
		}
		
		// Skip messages that contain spam keywords
		const lowerContent = content.toLowerCase();
		if (SPAM_WORDS.some(word => lowerContent.includes(word))) {
			return true;
		}
		
		// Don't skip otherwise
		return false;
	}
});
