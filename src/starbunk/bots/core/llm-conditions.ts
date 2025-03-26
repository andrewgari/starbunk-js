import { Message } from 'discord.js';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { logger } from '../../../services/logger';
import { Condition } from './conditions';

// LLM Manager import removed

// Create an LLM-based condition with fallback to regex
export const createLLMCondition = (
	prompt: string,
	regexFallback: RegExp,
	providerType: LLMProviderType = LLMProviderType.OLLAMA
): Condition => {
	return async (message: Message): Promise<boolean> => {
		try {
			const llmManager = getLLMManager();

			// First try the LLM
			const response = await llmManager.createSimpleCompletion(
				providerType,
				`${prompt} Message: "${message.content}"`,
				undefined,
				true
			);

			const result = response.toLowerCase().includes('yes');
			logger.debug(`LLM condition check result: ${result}`);
			return result;
		} catch (error) {
			// If LLM fails, use regex fallback
			logger.warn(`LLM condition failed, using regex fallback: ${error instanceof Error ? error.message : String(error)}`);
			return regexFallback.test(message.content);
		}
	};
};

// Helper to check if LLM is available
export const isLLMAvailable = async (): Promise<boolean> => {
	try {
		getLLMManager();
		return true;
	} catch (error) {
		logger.debug(`LLM not available: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
};
