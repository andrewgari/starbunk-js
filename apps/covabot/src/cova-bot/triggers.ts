import userId from './simplifiedUserId';
import { and, fromBot, fromUser, not, type TriggerCondition } from './conditions';
import { createTriggerResponse } from './triggerResponseFactory';
import { createUnifiedLLMCondition, createUnifiedLLMResponse } from './unifiedLlmTrigger';
import { getCovaIdentity } from '../services/identity';
import { logger } from '@starbunk/shared';
import { Message } from 'discord.js';

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const allowAllCondition: TriggerCondition = () => true;

// Enhanced identity function with validation and silent failure
async function getCovaIdentityWithValidation(message?: Message) {
	try {
		const identity = await getCovaIdentity(message);

		if (!identity) {
			logger.warn(`[CovaBot] Identity validation failed, silently discarding message`);
			return null; // This will cause the message to be silently discarded
		}

		logger.debug(`[CovaBot] Using identity: "${identity.botName}" with avatar ${identity.avatarUrl}`);
		return identity;
	} catch (error) {
		logger.error(`[CovaBot] Critical error getting identity, silently discarding message:`, error as Error);
		return null; // Silent discard on any error
	}
}

// Main trigger for CovaBot - uses unified LLM to decide AND generate response
export const covaTrigger = createTriggerResponse({
	name: 'cova-contextual-response',
	priority: 3,
	condition: and(
		createUnifiedLLMCondition(), // Single LLM call for decision
		// In production, ignore Cova (the person). In DEBUG_MODE we allow responding to Cova.
		DEBUG_MODE ? allowAllCondition : not(fromUser(userId.Cova)),
		not(fromBot()),
	),
	response: createUnifiedLLMResponse(), // Single LLM call for response
	identity: async (message) => getCovaIdentityWithValidation(message),
});

// Direct mention trigger - always respond to direct mentions with unified LLM
export const covaDirectMentionTrigger = createTriggerResponse({
	name: 'cova-direct-mention',
	priority: 5, // Highest priority
	condition: and(
		(message) => message.mentions.has(userId.Cova),
		DEBUG_MODE ? allowAllCondition : not(fromUser(userId.Cova)),
		not(fromBot()),
	),
	response: createUnifiedLLMResponse(), // Use unified LLM for consistent responses
	identity: async (message) => getCovaIdentityWithValidation(message),
});

// Stats command trigger - for debugging performance metrics
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority
	condition: and((message) => message.content.toLowerCase().startsWith('!cova-stats'), fromUser(userId.Cova)),
	response: async () => {
		const uptime = process.uptime();
		const memUsage = process.memoryUsage();
		const stats = `Uptime: ${Math.floor(uptime)}s\nMemory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;
		return `**CovaBot Performance Stats**\n\`\`\`\n${stats}\n\`\`\``;
	},
	identity: async (message) => getCovaIdentityWithValidation(message),
});
