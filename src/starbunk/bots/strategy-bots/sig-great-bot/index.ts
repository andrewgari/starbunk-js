import { createStrategyBot } from '../../core/bot-builder';
import { sigGreatTrigger } from './triggers';

// Create the Sig Great Bot that randomly says "Great!"
export default createStrategyBot({
	name: 'SigGreatBot',
	description: 'Randomly says "Great!"',
	defaultIdentity: {
		botName: 'Sig',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	skipBotMessages: true,
	triggers: [sigGreatTrigger]
});
