import { LLMPrompt } from '../types/llm-prompt';
import { masterBlueBotPrompt } from './master-blue-prompt';
import { blueBotDeceptiveCheckPrompt } from './deceptive-check-prompt';
import { blueBotStrategyPrompt } from './strategy-prompt';

export enum PromptType {
	BlueDetector = 'BlueDetector',
	BlueAcknowledge = 'BlueAcknowledge',
	BlueSentiment = 'BlueSentiment',
	BlueStrategy = 'BlueStrategy',
}

export interface BuiltPrompt {
	systemPrompt: string;
	userPrompt: string;
	temperature?: number;
	maxTokens?: number;
}

function resolvePrompt(type: PromptType): LLMPrompt {
	switch (type) {
		case PromptType.BlueDetector:
				return blueBotDeceptiveCheckPrompt;
		case PromptType.BlueStrategy:
				return blueBotStrategyPrompt;
		// The other prompt types are reserved for future use.
			case PromptType.BlueAcknowledge:
			case PromptType.BlueSentiment:
			default:
				return blueBotStrategyPrompt;
	}
}

/**
 * Combine the master BlueBot persona prompt with a specific task prompt
 * (detector, strategy, etc.) for a given user message.
 */
export function buildBlueBotPrompt(type: PromptType, message: string): BuiltPrompt {
	const specific = resolvePrompt(type);
	const systemPrompt =
		masterBlueBotPrompt.systemContent.trim() +
		'\n\n' +
		specific.systemContent.trim();

	const userPrompt = specific.formatUserMessage(message);
	const temperature =
		specific.defaultTemperature ?? masterBlueBotPrompt.defaultTemperature;
	const maxTokens =
		specific.defaultMaxTokens ?? masterBlueBotPrompt.defaultMaxTokens;

	return { systemPrompt, userPrompt, temperature, maxTokens };
}
