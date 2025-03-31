import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { INTERRUPT_CHANCE, createInterruptedMessage } from './constants';

// Get Venn's identity from Discord since he's the interrupter
async function getVennIdentity() {
	const discordService = getDiscordService();
	return discordService.getMemberAsBotIdentity(userId.Venn);
}

// Interrupt trigger - random chance to interrupt any message
export const interruptTrigger = createTriggerResponse({
	name: 'interrupt-trigger',
	priority: 1,
	condition: withChance(INTERRUPT_CHANCE),
	response: (message) => createInterruptedMessage(message.content),
	identity: getVennIdentity
});
