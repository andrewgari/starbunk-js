import { Logger } from '../logger';
import { LLMService, LLMServiceConfig } from './llmService';
import { OllamaProvider } from './providers/ollamaProvider';
import { OpenAIProvider } from './providers/openaiProvider';

/**
 * LLM provider type
 */
export enum LLMProviderType {
	OPENAI = 'openai',
	OLLAMA = 'ollama'
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
				throw new Error(`Unsupported LLM provider type: ${type}`);
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
					defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
					apiKey: process.env.OPENAI_API_KEY,
					logger
				};
				return new OpenAIProvider(config);
			}
			case LLMProviderType.OLLAMA: {
				const config: LLMServiceConfig = {
					defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3',
					apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
					logger
				};
				return new OllamaProvider(config);
			}
			default:
				throw new Error(`Unsupported LLM provider type: ${type}`);
		}
	}
}
