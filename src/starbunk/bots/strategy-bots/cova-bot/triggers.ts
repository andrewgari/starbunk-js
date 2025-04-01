import guildIds from '../../../../discord/guildIds';
import userId from '../../../../discord/userId';
import { getLLMManager } from '../../../../services/bootstrap';
import { and } from '../../core/conditions';
import { getBotIdentityFromDiscord } from '../../core/get-bot-identity';
import { createTriggerResponse } from '../../core/trigger-response';
import { COVA_BOT_PATTERNS } from './constants';
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
	condition: and(
		// Only process in Starbunk server
		message => !message.guild || message.guild.id === guildIds.StarbunkCrusaders,
		// Check for mentions of Cova in message content
		message => COVA_BOT_PATTERNS.Mention.test(message.content.toLowerCase()),
		// Use LLM to determine if Cova would respond to this message
		createLLMResponseDecisionCondition()
	),
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

// Stats command trigger - for debugging purposes
export const covaStatsCommandTrigger = createTriggerResponse({
	name: 'cova-stats-command',
	priority: 10, // Highest priority - always check this first
	condition: message => message.content.toLowerCase() === '!covabot-stats',
	response: () => {
		const llmManager = getLLMManager();
		const provider = llmManager.getDefaultProvider();
		return `CovaBot status: Active\nLLM Provider: ${provider ? provider.constructor.name : 'Unknown'}`;
	},
	identity: getCovaIdentity
});
