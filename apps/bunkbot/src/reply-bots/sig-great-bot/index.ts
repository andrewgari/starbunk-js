import { BotFactory } from '../../core/bot-factory';
import { sigGreatTrigger } from './triggers';

// Create the Sig Great Bot that randomly says "Great!"
export default BotFactory.createBot({
	name: 'SigGreatBot',
	description: 'Randomly says "Great!"',
	defaultIdentity: {
		botName: 'Sig',
		avatarUrl: '', // Will be overridden by dynamic identity
	},

	triggers: [sigGreatTrigger],
});
