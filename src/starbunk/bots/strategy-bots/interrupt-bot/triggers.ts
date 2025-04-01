import userId from '../../../../discord/userId';
import { getDiscordService } from '../../../../services/bootstrap';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { INTERRUPT_CHANCE, createInterruptedMessage } from './constants';

// Get Venn's identity from Discord since he's the interrupter
async function getVennIdentity() {
	try {
		const discordService = getDiscordService();
		const identity = await discordService.getMemberAsBotIdentity(userId.Venn);
		
		// Validate identity
		if (!identity || !identity.botName || !identity.avatarUrl) {
			throw new Error('Invalid bot identity retrieved for Venn (interrupt bot)');
		}
		
		return identity;
	} catch (error) {
		console.error(`Error getting Venn's identity for interrupt bot:`, error instanceof Error ? error : new Error(String(error)));
		
		// Fallback to a valid default identity
		return {
			botName: 'Venn',
			avatarUrl: 'https://cdn.discordapp.com/embed/avatars/4.png'
		};
	}
}

// Interrupt trigger - random chance to interrupt any message
export const interruptTrigger = createTriggerResponse({
	name: 'interrupt-trigger',
	priority: 1,
	condition: withChance(INTERRUPT_CHANCE),
	response: (message) => createInterruptedMessage(message.content),
	identity: getVennIdentity
});
