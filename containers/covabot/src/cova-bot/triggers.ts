import userId from './simplifiedUserId';
import { and, fromBot, fromUser, not } from './conditions';
import { createTriggerResponse } from './triggerResponseFactory';
import { getCovaIdentity } from '../services/identity';
import {
	logger,
	PromptRegistry,
	PromptType,
	createEnhancedLLMEmulatorResponse,
	createEnhancedLLMDecisionLogic,
} from '@starbunk/shared';
import { Message } from 'discord.js';
import { QdrantMemoryService } from '../services/qdrantMemoryService';
import { COVA_BOT_FALLBACK_RESPONSES, COVA_BOT_PROMPTS } from './constants';

// Register prompts for Covabot
PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
	systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.7,
	defaultMaxTokens: 200,
});

PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
	systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.2,
	defaultMaxTokens: 10,
});

const memoryService = QdrantMemoryService.getInstance();

const enhancedResponse = createEnhancedLLMEmulatorResponse(PromptType.COVA_EMULATOR, memoryService, {
	fallbackResponses: COVA_BOT_FALLBACK_RESPONSES,
});

const enhancedDecision = createEnhancedLLMDecisionLogic(PromptType.COVA_DECISION, memoryService, {
	adjustProbability: (probability, message, context) => {
		let prob = probability;
		const isRecentConversation = context.lastResponseMinutes < 30;
		prob *= isRecentConversation ? 1.2 : 0.7;

		const content = message.content.toLowerCase();
		if (content.includes('?') || content.includes('cova')) {
			prob *= 1.3;
		}
		if (message.content.length < 15 && !content.includes('?')) {
			prob *= 0.6;
		}
		if (context.conversationContext && context.conversationContext.length > 0) {
			prob *= 1.1;
		}
		return Math.min(prob, 0.85);
	},
});

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

// Main trigger for CovaBot - uses LLM to decide if it should respond
export const covaTrigger = createTriggerResponse({
	name: 'cova-contextual-response',
	priority: 3,
	condition: and(enhancedDecision, not(fromUser(userId.Cova)), not(fromBot())),
	response: enhancedResponse,
	identity: async (message) => getCovaIdentityWithValidation(message),
});

// Direct mention trigger - always respond to direct mentions
export const covaDirectMentionTrigger = createTriggerResponse({
	name: 'cova-direct-mention',
	priority: 5, // Highest priority
	condition: and((message) => message.mentions.has(userId.Cova), not(fromUser(userId.Cova)), not(fromBot())),
	response: enhancedResponse,
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
