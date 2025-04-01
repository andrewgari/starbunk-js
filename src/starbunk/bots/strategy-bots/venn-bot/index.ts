import { createStrategyBot } from '../../core/bot-builder';
import { cringeTrigger, randomVennTrigger } from './triggers';

// Create the Venn Bot that randomly says "Hmm..."
export default createStrategyBot({
	name: 'VennBot',
	description: 'Randomly says "Hmm..."',
	defaultIdentity: {
		botName: 'Venn',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	// Skip bot messages to avoid loops
	skipBotMessages: true,
	// Ordered by priority (higher number = higher priority)
	triggers: [cringeTrigger, randomVennTrigger]
});
