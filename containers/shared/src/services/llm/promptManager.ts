import { LLMProviderType } from './index';
import { LLMMessage } from './llmService';

/**
 * Interface for LLM prompt definition
 */
export interface LLMPrompt {
	/** System content for the prompt */
	systemContent: string;
	/** Format a user message for this prompt */
	formatUserMessage: (message: string) => string;
	/** Default temperature for this prompt type */
	defaultTemperature?: number;
	/** Default max tokens for this prompt type */
	defaultMaxTokens?: number;
}

/**
 * Type of prompts available in the system
 */
export enum PromptType {
	BLUE_DETECTOR = 'blueDetector',
	BLUE_ACKNOWLEDGMENT = 'blueAcknowledgment',
	BLUE_SENTIMENT = 'blueSentiment',
	COVA_EMULATOR = 'covaEmulator',
	COVA_DECISION = 'covaDecision',
	CONDITION_CHECK = 'conditionCheck'
}

/**
 * Registry of available prompts
 */
export class PromptRegistry {
	private static prompts: Map<PromptType, LLMPrompt> = new Map();

	/**
	 * Register a prompt
	 * @param type Prompt type
	 * @param prompt Prompt definition
	 */
	public static registerPrompt(type: PromptType, prompt: LLMPrompt): void {
		this.prompts.set(type, prompt);
	}

	/**
	 * Get a prompt by type
	 * @param type Prompt type
	 */
	public static getPrompt(type: PromptType): LLMPrompt | undefined {
		return this.prompts.get(type);
	}

	/**
	 * Check if a prompt is registered
	 * @param type Prompt type
	 */
	public static hasPrompt(type: PromptType): boolean {
		return this.prompts.has(type);
	}

	/**
	 * Get all registered prompt types
	 */
	public static getPromptTypes(): PromptType[] {
		return Array.from(this.prompts.keys());
	}
}

/**
 * Format messages for a prompt
 * @param promptType Prompt type
 * @param userMessage User message
 */
export function formatPromptMessages(promptType: PromptType, userMessage: string): LLMMessage[] {
	const prompt = PromptRegistry.getPrompt(promptType);
	if (!prompt) {
		throw new Error(`Prompt type ${promptType} not registered`);
	}

	return [
		{
			role: 'system',
			content: prompt.systemContent
		},
		{
			role: 'user',
			content: prompt.formatUserMessage(userMessage)
		}
	];
}

/**
 * Get default completion options for a prompt
 * @param promptType Prompt type
 */
export function getPromptDefaultOptions(promptType: PromptType): { temperature?: number; maxTokens?: number } {
	const prompt = PromptRegistry.getPrompt(promptType);
	if (!prompt) {
		throw new Error(`Prompt type ${promptType} not registered`);
	}

	return {
		temperature: prompt.defaultTemperature,
		maxTokens: prompt.defaultMaxTokens
	};
}

export interface PromptCompletionOptions {
	temperature?: number;
	maxTokens?: number;
	providerType?: LLMProviderType;
	fallbackToDefault?: boolean;
	contextData?: {
		personalityEmbedding?: number[];
		[key: string]: unknown;
	};
}
