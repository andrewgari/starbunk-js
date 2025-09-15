import environment from '../../environment';
import { Logger } from '../logger';
import { LLMService, LLMServiceConfig } from './llmService';
import { OllamaProvider } from './providers/ollamaProvider';
import { OpenAIProvider } from './providers/openaiProvider';

/**
 * LLM provider type
 */
export enum LLMProviderType {
	OPENAI = 'openai',
	OLLAMA = 'ollama',
}

/**
 * Error class for LLM provider errors
 */
export class LLMProviderError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'LLMProviderError';
	}
}

/**
 * Factory for creating LLM providers
 */
export class LLMFactory {
	/**
	 * Create an LLM provider
	 * @param type Provider type
	 * @param config Provider configuration
	 */
	public static createProvider(type: LLMProviderType, config: LLMServiceConfig): LLMService {
		switch (type) {
			case LLMProviderType.OPENAI:
				return new OpenAIProvider(config);
			case LLMProviderType.OLLAMA:
				return new OllamaProvider(config);
			default:
				throw new LLMProviderError(`Unknown LLM provider type: ${type}`);
		}
	}

	/**
	 * Create an LLM provider from environment variables
	 * @param type Provider type
	 * @param logger Logger instance
	 */
	public static createProviderFromEnv(type: LLMProviderType, logger: Logger): LLMService {
		switch (type) {
			case LLMProviderType.OPENAI: {
				const config: LLMServiceConfig = {
					logger,
					defaultModel: environment.llm.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
					apiKey: environment.llm.OPENAI_API_KEY || '',
				};
				return this.createProvider(type, config);
			}
			case LLMProviderType.OLLAMA: {
				const config: LLMServiceConfig = {
					logger,
					defaultModel: environment.llm.OLLAMA_DEFAULT_MODEL || 'llama3:4b',
					apiUrl: environment.llm.OLLAMA_API_URL || 'http://localhost:11434',
				};
				return this.createProvider(type, config);
			}
			default:
				throw new LLMProviderError(`Unknown LLM provider type: ${type}`);
		}
	}
}
