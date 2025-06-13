import { Message } from 'discord.js';
import { getLLMManager } from '../../../services/bootstrap';
import { LLMProviderType } from '../../../services/llm';
import { LLMManager } from '../../../services/llm/llmManager';
import { PromptType } from '../../../services/llm/promptManager';
import { logger } from '../../../services/logger';
import { Condition } from './conditions';

interface LLMConditionOptions {
	llmManager?: LLMManager;
	regexFallback?: RegExp;
	providerType?: LLMProviderType;
}

// Create an LLM-based condition
export function createLLMCondition(
	prompt: string,
	options: LLMConditionOptions = {}
): Condition {
	return async (message: Message): Promise<boolean> => {
		try {
			// Use provided LLMManager or get from bootstrap
			const llmManager = options.llmManager || getLLMManager();

			// First try the LLM
			const response = await llmManager.createPromptCompletion(
				PromptType.CONDITION_CHECK,
				`${prompt} Message: "${message.content}"`,
				{
					temperature: 0.7,
					maxTokens: 100,
					providerType: options.providerType
				}
			);

			const result = response.toLowerCase().includes('yes');
			logger.debug(`LLM condition check result: ${result}`);
			return result;
		} catch (error) {
			// If LLM fails and we have a regex fallback, use it
			if (options.regexFallback) {
				logger.warn(`LLM condition failed, using regex fallback: ${error instanceof Error ? error.message : String(error)}`);
				return options.regexFallback.test(message.content);
			}

			// Otherwise just log and return false
			logger.warn(`LLM condition failed: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	};
}

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
