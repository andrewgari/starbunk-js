import { Logger } from '../logger';
import { LLMFactory, LLMProviderType } from './llmFactory';
import { LLMCompletionOptions, LLMCompletionResponse, LLMService } from './llmService';
import { PromptRegistry, PromptType, formatPromptMessages, getPromptDefaultOptions } from './promptManager';

/**
 * Error thrown when a provider is not available
 */
export class ProviderNotAvailableError extends Error {
	constructor(providerType: LLMProviderType) {
		super(`Provider ${providerType} is not available`);
		this.name = 'ProviderNotAvailableError';
	}
}

/**
 * Error thrown when a prompt is not registered
 */
export class PromptNotRegisteredError extends Error {
	constructor(promptType: PromptType) {
		super(`Prompt type ${promptType} not registered`);
		this.name = 'PromptNotRegisteredError';
	}
}

/**
 * Options for prompt completion
 */
export interface PromptCompletionOptions {
	/** Provider type to use (optional, uses default if not specified) */
	providerType?: LLMProviderType;
	/** Whether to fall back to default provider if specified provider is not available */
	fallbackToDefault?: boolean;
	/** Whether to fall back to direct API call if prompt registry fails */
	fallbackToDirectCall?: boolean;
	/** Model to use (optional, uses provider's default if not specified) */
	model?: string;
	/** Temperature to use (optional, uses prompt's default if not specified) */
	temperature?: number;
	/** Max tokens to use (optional, uses prompt's default if not specified) */
	maxTokens?: number;
}

/**
 * Manager for LLM services
 */
export class LLMManager {
	private providers: Map<LLMProviderType, LLMService> = new Map();
	private logger: Logger;
	private defaultProvider: LLMProviderType;

	constructor(logger: Logger, defaultProvider: LLMProviderType) {
		this.logger = logger;
		this.defaultProvider = defaultProvider;
	}

	/**
	 * Initialize a provider
	 * @param type Provider type
	 */
	public async initializeProvider(type: LLMProviderType): Promise<boolean> {
		try {
			const provider = LLMFactory.createProviderFromEnv(type, this.logger);
			const initialized = await provider.initialize();

			if (initialized) {
				this.providers.set(type, provider);
				this.logger.debug(`Initialized ${type} provider`);
			} else {
				this.logger.error(`Failed to initialize ${type} provider`);
			}

			return initialized;
		} catch (error) {
			this.logger.error(`Error initializing ${type} provider`, error as Error);
			return false;
		}
	}

	/**
	 * Initialize all supported providers
	 */
	public async initializeAllProviders(): Promise<void> {
		// Always try to initialize the default provider first
		await this.initializeProvider(this.defaultProvider);

		// Initialize other providers
		for (const type of Object.values(LLMProviderType)) {
			if (type !== this.defaultProvider) {
				await this.initializeProvider(type as LLMProviderType);
			}
		}
	}

	/**
	 * Get a provider
	 * @param type Provider type
	 */
	public getProvider(type: LLMProviderType): LLMService | undefined {
		return this.providers.get(type);
	}

	/**
	 * Get the default provider
	 */
	public getDefaultProvider(): LLMService | undefined {
		return this.providers.get(this.defaultProvider);
	}

	/**
	 * Check if a provider is available
	 * @param type Provider type
	 */
	public isProviderAvailable(type: LLMProviderType): boolean {
		const provider = this.providers.get(type);
		return provider !== undefined && provider.isInitialized();
	}

	/**
	 * Get an available provider, with fallback to default if specified
	 * @param type Preferred provider type
	 * @param fallbackToDefault Whether to fall back to the default provider
	 * @throws ProviderNotAvailableError if no provider is available
	 */
	private getAvailableProvider(type: LLMProviderType, fallbackToDefault = false): LLMService {
		// Try the specified provider
		if (this.isProviderAvailable(type)) {
			return this.providers.get(type)!;
		}

		// Try the default provider if fallback is enabled
		if (fallbackToDefault && type !== this.defaultProvider && this.isProviderAvailable(this.defaultProvider)) {
			this.logger.warn(`Provider ${type} not available, falling back to ${this.defaultProvider}`);
			return this.providers.get(this.defaultProvider)!;
		}

		// No provider available
		throw new ProviderNotAvailableError(type);
	}

	/**
	 * Create a completion using a provider
	 * @param type Provider type (optional, uses default if not specified)
	 * @param options Completion options
	 * @param fallbackToDefault Whether to fall back to the default provider
	 */
	public async createCompletion(
		typeOrOptions: LLMProviderType | LLMCompletionOptions,
		optionsOrFallback?: LLMCompletionOptions | boolean,
		fallbackToDefault = true
	): Promise<LLMCompletionResponse> {
		try {
			// Handle overloaded parameters
			let type: LLMProviderType;
			let options: LLMCompletionOptions;
			let fallback: boolean;

			if (typeof typeOrOptions === 'string') {
				// First overload: (type, options, fallback)
				type = typeOrOptions as LLMProviderType;
				options = optionsOrFallback as LLMCompletionOptions;
				fallback = fallbackToDefault;
			} else {
				// Second overload: (options, fallback)
				type = this.defaultProvider;
				options = typeOrOptions as LLMCompletionOptions;
				fallback = optionsOrFallback as boolean ?? true;
			}

			// Get an available provider
			const provider = this.getAvailableProvider(type, fallback);

			// Create the completion
			return await provider.createCompletion(options);
		} catch (error) {
			if (error instanceof ProviderNotAvailableError) {
				this.logger.error(error.message);
			} else {
				this.logger.error('Error creating completion', error as Error);
			}
			throw error;
		}
	}

	/**
	 * Create a simple completion with just a prompt
	 * @param typeOrPrompt Provider type or prompt text
	 * @param promptOrSystemPrompt Prompt text or system prompt
	 * @param systemPromptOrFallback System prompt or fallback flag
	 * @param fallbackToDefault Whether to fall back to the default provider
	 */
	public async createSimpleCompletion(
		typeOrPrompt: LLMProviderType | string,
		promptOrSystemPrompt?: string | boolean,
		systemPromptOrFallback?: string | boolean,
		fallbackToDefault = true
	): Promise<string> {
		try {
			// Handle overloaded parameters
			let type: LLMProviderType;
			let prompt: string;
			let systemPrompt: string | undefined;
			let fallback: boolean;

			if (typeof typeOrPrompt === 'string' && (typeof promptOrSystemPrompt === 'string' || promptOrSystemPrompt === undefined)) {
				if (Object.values(LLMProviderType).includes(typeOrPrompt as LLMProviderType)) {
					// First overload: (type, prompt, systemPrompt, fallback)
					type = typeOrPrompt as LLMProviderType;
					prompt = promptOrSystemPrompt as string;
					systemPrompt = systemPromptOrFallback as string;
					fallback = fallbackToDefault;
				} else {
					// Second overload: (prompt, systemPrompt, fallback)
					type = this.defaultProvider;
					prompt = typeOrPrompt;
					systemPrompt = promptOrSystemPrompt as string;
					fallback = systemPromptOrFallback as boolean ?? true;
				}
			} else {
				// Invalid parameters
				throw new Error('Invalid parameters for createSimpleCompletion');
			}

			// Get an available provider
			const provider = this.getAvailableProvider(type, fallback);

			// Create the completion
			return await provider.createSimpleCompletion(prompt, systemPrompt);
		} catch (error) {
			if (error instanceof ProviderNotAvailableError) {
				this.logger.error(error.message);
			} else {
				this.logger.error('Error creating simple completion', error as Error);
			}
			throw error;
		}
	}

	/**
	 * Create a completion using a registered prompt
	 * @param promptType The type of prompt to use
	 * @param userMessage The user message to format
	 * @param options Additional options for the completion
	 */
	public async createPromptCompletion(
		promptType: PromptType,
		userMessage: string,
		options: PromptCompletionOptions = {}
	): Promise<string> {
		const {
			providerType,
			fallbackToDefault = true,
			fallbackToDirectCall = true,
			model,
			temperature,
			maxTokens
		} = options;

		// Get the provider type
		const type = providerType || this.defaultProvider;

		try {
			// Try using the prompt registry
			try {
				// Format the messages
				const messages = formatPromptMessages(promptType, userMessage);

				// Get default options for the prompt
				const defaultOptions = getPromptDefaultOptions(promptType);

				// Get an available provider
				const provider = this.getAvailableProvider(type, fallbackToDefault);

				// Create the completion
				const response = await this.createCompletion(
					type,
					{
						model: model || provider.getAvailableModels()[0],
						messages,
						temperature: temperature ?? defaultOptions.temperature,
						maxTokens: maxTokens ?? defaultOptions.maxTokens
					},
					fallbackToDefault
				);

				return response.content;
			} catch (error) {
				// If the error is not related to provider availability or prompt registration, rethrow
				if (!(error instanceof ProviderNotAvailableError) &&
					!(error instanceof PromptNotRegisteredError) &&
					!fallbackToDirectCall) {
					throw error;
				}

				// Log the error
				this.logger.warn(`Error using prompt registry for ${promptType}, falling back to direct call: ${error instanceof Error ? error.message : String(error)}`);

				// Fall back to direct API call if enabled
				if (fallbackToDirectCall) {
					// Get the prompt from the registry
					const prompt = PromptRegistry.getPrompt(promptType);
					if (!prompt) {
						throw new PromptNotRegisteredError(promptType);
					}

					// Get an available provider
					const provider = this.getAvailableProvider(type, fallbackToDefault);

					// Create the completion
					const response = await this.createCompletion(
						type,
						{
							model: model || provider.getAvailableModels()[0],
							messages: [
								{
									role: 'system',
									content: prompt.systemContent
								},
								{
									role: 'user',
									content: prompt.formatUserMessage(userMessage)
								}
							],
							temperature: temperature ?? prompt.defaultTemperature,
							maxTokens: maxTokens ?? prompt.defaultMaxTokens
						},
						fallbackToDefault
					);

					return response.content;
				}

				// Rethrow the error if fallback is not enabled
				throw error;
			}
		} catch (error) {
			this.logger.error(`Error creating completion for prompt ${promptType}`, error as Error);
			throw error;
		}
	}
}
