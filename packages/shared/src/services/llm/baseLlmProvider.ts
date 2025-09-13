import { Logger } from '../logger';
import { LLMCompletionOptions, LLMCompletionResponse, LLMMessage, LLMService, LLMServiceConfig } from './llmService';

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider implements LLMService {
	protected initialized = false;
	protected config: LLMServiceConfig;
	protected logger: Logger;

	constructor(config: LLMServiceConfig) {
		this.config = config;
		this.logger = config.logger;
	}

	/**
	 * Initialize the LLM service
	 */
	public async initialize(): Promise<boolean> {
		try {
			this.initialized = await this.initializeProvider();
			return this.initialized;
		} catch (error) {
			this.logger.error(`Error initializing ${this.getProviderName()} provider`, error as Error);
			this.initialized = false;
			return false;
		}
	}

	/**
	 * Check if the LLM service is initialized
	 */
	public isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Create a simple completion with just a prompt
	 * @param prompt The prompt to send
	 * @param systemPrompt Optional system prompt
	 */
	public async createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string> {
		const messages: LLMMessage[] = [];

		if (systemPrompt) {
			messages.push({
				role: 'system',
				content: systemPrompt,
			});
		}

		messages.push({
			role: 'user',
			content: prompt,
		});

		const response = await this.createCompletion({
			model: this.config.defaultModel,
			messages,
		});

		return response.content;
	}

	/**
	 * Provider-specific initialization
	 */
	protected abstract initializeProvider(): Promise<boolean>;

	/**
	 * Get the provider name
	 */
	public abstract getProviderName(): string;

	/**
	 * Get available models
	 */
	public abstract getAvailableModels(): string[];

	/**
	 * Create a completion
	 * @param options Completion options
	 */
	public abstract createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;
}
