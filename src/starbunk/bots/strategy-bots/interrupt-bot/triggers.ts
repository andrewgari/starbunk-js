import { Message } from 'discord.js';
import { logger } from '../../../../services/logger';
import { withChance } from '../../core/conditions';
import { createTriggerResponse } from '../../core/trigger-response';
import { INTERRUPT_CHANCE, createInterruptedMessage } from './constants';

// Trigger for random interruptions
export const interruptTrigger = createTriggerResponse({
	name: 'interrupt-trigger',
	condition: (message: Message) => {
		// Random chance to interrupt
		const succeeds = withChance(INTERRUPT_CHANCE)(message);
		logger.debug(`InterruptBot chance check (${INTERRUPT_CHANCE}%): ${succeeds}`);
		return succeeds;
	},
	response: async (message: Message) => createInterruptedMessage(message.content),
	priority: 1
});
