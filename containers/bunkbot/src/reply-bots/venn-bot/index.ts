import { BotFactory } from '../../core/bot-factory';
import { cringeTrigger, randomVennTrigger } from './triggers';

// Create the Venn Bot that randomly says "Hmm..."
export default BotFactory.createBot({
	name: 'VennBot',
	description: 'Randomly says "Hmm..."',
	// Legacy fallback identity
	defaultIdentity: {
		botName: 'VennBot',
		avatarUrl: 'https://cdn.discordapp.com/avatars/151120340343455744/avatar.png' // Fallback Venn avatar
	},
	// New identity configuration system - Dynamic Identity Bot
	identityConfig: {
		type: 'dynamic',
		targetUsername: 'Venn' // Target user for identity resolution
	},
	// Skip bot messages to avoid loops
	skipBotMessages: true,
	// Ordered by priority (higher number = higher priority)
	triggers: [cringeTrigger, randomVennTrigger]
});
