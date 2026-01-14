import { LLMPrompt } from '../types/llm-prompt';
import { masterBlueBotPrompt } from './master-blue-prompt';
import { blueBotDeceptiveCheckPrompt } from './deceptive-check-prompt';
import { blueBotStrategyPrompt } from './strategy-prompt';
import { blueBotEnemyPrompt } from './enemy-comment-prompt';
import { blueBotPleasedPrompt } from './pleased-prompt';
import { blueBotNiceCommentPrompt } from './nice-comment-prompt';

export enum PromptType {
	BlueDetector = 'BlueDetector',
	BlueAcknowledge = 'BlueAcknowledge',
	BlueSentiment = 'BlueSentiment',
	BlueStrategy = 'BlueStrategy',
	BlueEnemy = 'BlueEnemy',
	BluePleased = 'BluePleased',
	BlueNiceComment = 'BlueNiceComment',
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
		case PromptType.BlueEnemy:
			return blueBotEnemyPrompt;
		case PromptType.BluePleased:
			return blueBotPleasedPrompt;
		case PromptType.BlueNiceComment:
			return blueBotNiceCommentPrompt;
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
