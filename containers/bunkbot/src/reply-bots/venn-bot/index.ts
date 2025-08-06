import { BotFactory } from '../../core/bot-factory';
import { cringeTrigger, randomVennTrigger } from './triggers';

// Create the Venn Bot that randomly says "Hmm..."
export default BotFactory.createBot({
	name: 'VennBot',
	description: 'Randomly says "Hmm..."',
	defaultIdentity: {
		botName: 'Venn',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	// Ordered by priority (higher number = higher priority)
	triggers: [cringeTrigger, randomVennTrigger]
});
