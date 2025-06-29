import { BotFactory } from '../../core/bot-factory';
import { createTriggerResponse } from '../../core/trigger-response';

export default BotFactory.createBot({
	name: 'ExampleBot',
	description: 'An example bot created with the simplified approach',
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
				return 'This is an example response from the simplified bot architecture!';
			},
			priority: 1
		})
	],
	responseRate: 100
});
