import { createStrategyBot } from '../../core/bot-builder';
import { INTERRUPT_BOT_AVATAR_URL, INTERRUPT_BOT_NAME } from './constants';
import { interruptTrigger } from './triggers';

// Create the Interrupt Bot that randomly interrupts messages
export default createStrategyBot({
	name: INTERRUPT_BOT_NAME,
	description: 'Randomly interrupts messages with an apology',
	defaultIdentity: {
		botName: INTERRUPT_BOT_NAME,
		avatarUrl: INTERRUPT_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [interruptTrigger]
});
