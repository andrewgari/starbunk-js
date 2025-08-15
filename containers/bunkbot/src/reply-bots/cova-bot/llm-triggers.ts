import { Message } from 'discord.js';
import {
	PromptRegistry,
	PromptType,
	createEnhancedLLMEmulatorResponse,
	createEnhancedLLMDecisionLogic,
} from '@starbunk/shared';
import { getPersonalityService } from '../../../../services/personalityService';
import { ResponseGenerator } from '../../core/responses';
import { COVA_BOT_FALLBACK_RESPONSES, COVA_BOT_PROMPTS } from './constants';

// Simple user IDs for testing and development
const userId = {
	Cova: '123456789',
};

// Register prompts for Cova bot
PromptRegistry.registerPrompt(PromptType.COVA_EMULATOR, {
	systemContent: COVA_BOT_PROMPTS.EmulatorPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.7,
	defaultMaxTokens: 150,
});

PromptRegistry.registerPrompt(PromptType.COVA_DECISION, {
	systemContent: COVA_BOT_PROMPTS.DecisionPrompt,
	formatUserMessage: (message: string): string => message,
	defaultTemperature: 0.2,
	defaultMaxTokens: 10,
});

/**
 * Creates an LLM-based response generator using Cova's personality profile
 */
export const createLLMEmulatorResponse = (): ResponseGenerator => {
	const personalityService = getPersonalityService();
	return createEnhancedLLMEmulatorResponse(PromptType.COVA_EMULATOR, undefined, {
		fallbackResponses: COVA_BOT_FALLBACK_RESPONSES,
		completionOptions: {
			contextData: {
				personalityEmbedding: personalityService.getPersonalityEmbedding() ?? undefined,
			},
		},
	});
};

/**
 * Creates an LLM-based condition for deciding whether Cova should respond
 */
export const createLLMResponseDecisionCondition = () => {
	const baseDecision = createEnhancedLLMDecisionLogic(PromptType.COVA_DECISION, undefined, {
		adjustProbability: (probability, _message, context) => {
			const isRecentConversation = context.lastResponseMinutes < 10;
			const prob = isRecentConversation ? probability * 1.2 : probability * 0.8;
			return Math.min(prob, 0.9);
		},
	});

	return async (message: Message): Promise<boolean> => {
		if (message.mentions.has(userId.Cova)) return true;
		if (message.author.bot) return false;
		return baseDecision(message);
	};
};
