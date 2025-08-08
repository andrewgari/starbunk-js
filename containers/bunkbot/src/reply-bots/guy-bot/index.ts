import { BotFactory } from '../../core/bot-factory';
import { guyTrigger } from './triggers';

// Create the Guy Bot with dynamic identity resolution
export default BotFactory.createBot({
	name: 'GuyBot',
	description: 'Responds to "guy" mentions with random meme responses',
	defaultIdentity: {
		botName: 'Guy',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	// All triggers with their priorities
	triggers: [guyTrigger]
});
