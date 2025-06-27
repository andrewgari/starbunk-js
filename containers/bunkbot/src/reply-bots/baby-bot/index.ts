import { BotFactory } from '../../core/bot-factory';
import { createTriggerResponse } from '../../core/trigger-response';

// Create the Baby Bot that responds with Metroid gif
export default BotFactory.createBot({
	name: 'BabyBot',
	description: 'Posts a Metroid gif when someone mentions "baby"',
	defaultIdentity: {
		botName: 'BabyBot',
		avatarUrl: 'https://i.redd.it/qc9qus78dc581.jpg'
	},
	triggers: [
		createTriggerResponse({
			name: 'baby-trigger',
			condition: (message: any) => {
				return /\bbaby\b/i.test(message.content);
			},
			response: () => {
				return 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif';
			},
			priority: 1
		})
	]
});
