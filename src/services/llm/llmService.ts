import { Logger } from '../logger';
import { LLMProviderType } from './llmFactory';

/**
 * Interface for LLM completion request options
 */
export interface LLMCompletionOptions {
	model: string;
	messages: LLMMessage[];
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	stop?: string[];
	provider?: LLMProviderType;
}

/**
 * Interface for LLM message format
 */
export interface LLMMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/**
 * Interface for LLM completion response
 */
export interface LLMCompletionResponse {
	content: string;
	model: string;
	provider: string;
}

/**
 * Interface for LLM service configuration
 */
export interface LLMServiceConfig {
	defaultModel: string;
	apiKey?: string;
	apiUrl?: string;
	logger: Logger;
}

/**
 * Interface for LLM service
 */
export interface LLMService {
	/**
	 * Initialize the LLM service
	 */
	initialize(): Promise<boolean>;

	/**
	 * Check if the LLM service is initialized
	 */
	isInitialized(): boolean;

	/**
	 * Get the provider name
	 */
	getProviderName(): string;

	/**
	 * Get available models
	 */
	getAvailableModels(): string[];

	/**
	 * Create a completion
	 * @param options Completion options
	 */
	createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;

	/**
	 * Create a simple completion with just a prompt
	 * @param prompt The prompt to send
	 * @param systemPrompt Optional system prompt
	 */
	createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string>;
}
