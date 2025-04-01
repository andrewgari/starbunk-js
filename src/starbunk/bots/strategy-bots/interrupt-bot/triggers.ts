import { withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { INTERRUPT_CHANCE, createInterruptedMessage } from './constants';

// Get a random member's identity from Discord for interrupting
async function getRandomInterrupterIdentity() {
	return getBotIdentityFromDiscord({
		useRandomMember: true,
		fallbackName: 'Interrupter',
		fallbackAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/4.png'
	});
}

// Interrupt trigger - random chance to interrupt any message
export const interruptTrigger = createTriggerResponse({
	name: 'interrupt-trigger',
	priority: 1,
	condition: withChance(INTERRUPT_CHANCE),
	response: (message) => createInterruptedMessage(message.content),
	identity: getRandomInterrupterIdentity
});
