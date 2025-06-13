import userId from '../../../../discord/userId';
import { PerformanceTimer } from '../../../../utils/time';
import { and, fromBot, fromUser, not, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { createLLMEmulatorResponse, createLLMResponseDecisionCondition } from './llm-triggers';

// Get Cova's identity from Discord
async function getCovaIdentity() {
	return getBotIdentityFromDiscord({
		userId: userId.Cova,
		fallbackName: 'CovaBot',
	});
}

// Main trigger for CovaBot - uses LLM to decide if it should respond
export const covaTrigger = createTriggerResponse({
	name: 'cova-contextual-response',
	priority: 3,
	condition: and(
		createLLMResponseDecisionCondition(),
		not(fromUser(userId.Cova)),
		not(fromBot()),
		withChance(50)
	),
	response: createLLMEmulatorResponse(),
	identity: getCovaIdentity
});

// Direct mention trigger - always respond to direct mentions
export const covaDirectMentionTrigger = createTriggerResponse({
	name: 'cova-direct-mention',
	priority: 5, // Highest priority
	condition: and(
		message => message.mentions.has(userId.Cova),
		not(fromUser(userId.Cova)),
		not(fromBot())
	),
	response: createLLMEmulatorResponse(),
	identity: getCovaIdentity
});

// Stats command trigger - for debugging performance metrics
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority
	condition: and(
		message => message.content.toLowerCase().startsWith('!cova-stats'),
		fromUser(userId.Cova),
	),
	response: async () => {
		const stats = PerformanceTimer.getInstance().getStatsString();
		return `**CovaBot Performance Stats**\n\`\`\`\n${stats}\n\`\`\``;
	},
	identity: getCovaIdentity
});

