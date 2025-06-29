import { getUserId } from '@starbunk/shared';
import { PerformanceTimer } from '../../../../utils/time';
import { and, fromBot, fromUser, not, withChance } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { createLLMEmulatorResponse, createLLMResponseDecisionCondition } from './llm-triggers';

// Get Cova's identity from Discord
async function getCovaIdentity() {
	const covaUserId = await getUserId('Cova');
	if (!covaUserId) {
		throw new Error('Cova user ID not found in database');
	}

	return getBotIdentityFromDiscord({
		userId: covaUserId,
		fallbackName: 'CovaBot',
	});
}

// Main trigger for CovaBot - uses LLM to decide if it should respond
export const covaTrigger = createTriggerResponse({
	name: 'cova-contextual-response',
	priority: 3,
	condition: and(
		createLLMResponseDecisionCondition(),
		async (message) => {
			const covaUserId = await getUserId('Cova');
			return covaUserId ? message.author.id !== covaUserId : true;
		},
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
		async (message) => {
			const covaUserId = await getUserId('Cova');
			return covaUserId ? message.mentions.has(covaUserId) : false;
		},
		async (message) => {
			const covaUserId = await getUserId('Cova');
			return covaUserId ? message.author.id !== covaUserId : true;
		},
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
		async (message) => {
			const covaUserId = await getUserId('Cova');
			return covaUserId ? message.author.id === covaUserId : false;
		},
	),
	response: async () => {
		const stats = PerformanceTimer.getInstance().getStatsString();
		return `**CovaBot Performance Stats**\n\`\`\`\n${stats}\n\`\`\``;
	},
	identity: getCovaIdentity
});

