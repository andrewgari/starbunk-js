import { BotFactory } from '../../core/bot-factory';
import { createTriggerResponse } from '../../core/trigger-response';

// Simple test bot that responds to "test" messages
export default BotFactory.createBot({
	name: 'TestBot',
	description: 'A simple test bot that responds to "test" messages',
	defaultIdentity: {
		botName: 'TestBot',
		avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png'
	},
	triggers: [
		createTriggerResponse({
			name: 'test-response',
			condition: (message: any) => {
				return message.content.toLowerCase().includes('test');
			},
			response: () => {
				return 'Test response received! 🤖';
			},
			priority: 1
		})
	]
});
