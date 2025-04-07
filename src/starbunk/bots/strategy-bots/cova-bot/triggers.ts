import userId from '../../../../discord/userId';
import { PerformanceTimer } from '../../../../utils/time';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { createLLMEmulatorResponse, createLLMResponseDecisionCondition } from './llm-triggers';

// Get Cova's identity from Discord
async function getCovaIdentity() {
	return getBotIdentityFromDiscord({
		userId: userId.Cova,
		fallbackName: 'Cova',
		fallbackAvatarUrl: 'https://cdn.discordapp.com/embed/avatars/3.png'
	});
}

// Main trigger for CovaBot - uses LLM to decide if it should respond
export const covaTrigger = createTriggerResponse({
	name: 'cova-contextual-response',
	priority: 3,
	condition: createLLMResponseDecisionCondition(),
	response: createLLMEmulatorResponse(),
	identity: getCovaIdentity
});

// Direct mention trigger - always respond to direct mentions
export const covaDirectMentionTrigger = createTriggerResponse({
	name: 'cova-direct-mention',
	priority: 5, // Highest priority
	condition: message => message.mentions.has(userId.Cova),
	response: createLLMEmulatorResponse(),
	identity: getCovaIdentity
});

// Stats command trigger - for debugging performance metrics
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority
	condition: message => message.content.toLowerCase().startsWith('!cova-stats'),
	response: async () => {
		const stats = PerformanceTimer.getInstance().getStatsString();
		return `**CovaBot Performance Stats**\n\`\`\`\n${stats}\n\`\`\``;
	},
	identity: getCovaIdentity
});

