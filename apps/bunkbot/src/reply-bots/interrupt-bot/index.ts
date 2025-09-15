import { BotFactory } from '../../core/bot-factory';
import { interruptTrigger } from './triggers';

// Create the Interrupt Bot that randomly interrupts messages
export default BotFactory.createBot({
	name: 'Interrupt Bot',
	description: 'Randomly interrupts messages with an apology',
	defaultIdentity: {
		botName: 'Venn',
		avatarUrl: '', // Will be overridden by dynamic identity
	},

	triggers: [interruptTrigger],
});
