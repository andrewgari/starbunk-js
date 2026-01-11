import userId from './simplified-user-id';
import { and } from './conditions';
import { createTriggerResponse } from './trigger-response-factory';
import { createLLMEmulatorResponse, createLLMResponseDecisionCondition } from './simplified-llm-triggers';
import { Message } from 'discord.js';

/**
 * User filter condition that checks DEBUG_MODE at runtime
 *
 * In DEBUG_MODE (calibration): ONLY respond to Cova (the person) for testing
 * In production: Ignore Cova (the person) to prevent self-responses
 */
function createUserFilterCondition(): (message: Message) => Promise<boolean> {
	return async (message: Message): Promise<boolean> => {
		const isDebugMode = process.env.DEBUG_MODE === 'true';
		const isFromCova = message.author.id === userId.Cova;

		if (isDebugMode) {
			// Calibration mode: only respond to Cova
			return isFromCova;
		} else {
			// Production mode: ignore Cova to prevent self-responses
			return !isFromCova;
		}
	};
}

/**
 * Unified CovaBot trigger - handles all messages with single-prompt LLM
 *
 * The LLM receives context about whether Cova was mentioned/referenced
 * and makes both the decision to respond AND generates the response in one call.
 *
 * This consolidates the previous two-trigger system (direct mention + contextual)
 * into a single, simpler flow.
 */
export const covaTrigger = createTriggerResponse({
	name: 'cova-unified-response',
	priority: 5,
	condition: and(
		createLLMResponseDecisionCondition(), // Simple filter: non-empty, non-bot messages
		createUserFilterCondition(), // Filter based on DEBUG_MODE
	),
	response: createLLMEmulatorResponse(), // Single LLM call handles decision + response
});

/**
 * Legacy alias for backward compatibility
 * Both triggers now use the same unified single-prompt approach
 */
export const covaDirectMentionTrigger = covaTrigger;

// Stats command trigger - for debugging performance metrics
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority
	condition: and(
		(message) => message.content.toLowerCase().startsWith('!cova-stats'),
		(message) => message.author.id === userId.Cova,
	),
	response: async () => {
		const uptime = process.uptime();
		const memUsage = process.memoryUsage();
		const stats = `Uptime: ${Math.floor(uptime)}s\nMemory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;
		return `**CovaBot Performance Stats**\n\`\`\`\n${stats}\n\`\`\``;
	},
});
