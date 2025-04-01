import { createStrategyBot } from '../../core/bot-builder';
import { interruptTrigger } from './triggers';

// Create the Interrupt Bot that randomly interrupts messages
export default createStrategyBot({
	name: 'Interrupt Bot',
	description: 'Randomly interrupts messages with an apology',
	defaultIdentity: {
		botName: 'Venn',
		avatarUrl: '' // Will be overridden by dynamic identity
	},
	skipBotMessages: true,
	triggers: [interruptTrigger]
});
