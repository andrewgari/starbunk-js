import { Logger } from '../logger';
import { LLMFactory } from './llmFactory';
import { LLMProvider, LLMProviderType } from './llmProvider';
import { LLMCompletion, LLMCompletionOptions } from './llmService';
import { PromptType, formatPromptMessages, getPromptDefaultOptions } from './promptManager';
import { ensureError } from '../../utils/errorUtils';

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
	/** Context data for the prompt */
	contextData?: {
		personalityEmbedding?: number[];
		[key: string]: unknown;
	};
}

/**
 * Manager for LLM services
 */
export class LLMManager {
	private readonly defaultProvider: LLMProviderType;
	private readonly providers: Map<LLMProviderType, LLMProvider>;
	private readonly logger: Logger;

	constructor(logger: Logger, defaultProvider: LLMProviderType = LLMProviderType.OLLAMA) {
		this.defaultProvider = defaultProvider;
		this.providers = new Map();
		this.logger = logger;
	}

	/**
	 * Initialize a provider
	 * @param type Provider type
	 */
	public async initializeProvider(type: LLMProviderType): Promise<boolean> {
		try {
			this.logger.debug(`Initializing ${type} provider...`);
			const provider = this.createProvider(type);
			const initialized = await provider.initialize();

			if (initialized) {
				this.providers.set(type, provider);
				this.logger.info(`Successfully initialized ${type} provider`);
			} else {
				this.logger.error(`Failed to initialize ${type} provider - provider.initialize() returned false`);
			}

			return initialized;
		} catch (error) {
			this.logger.error(`Error initializing ${type} provider:`, ensureError(error));
			return false;
		}
	}

	private createProvider(type: LLMProviderType): LLMProvider {
		try {
			this.logger.debug(`Creating provider of type ${type}...`);
			// Use the factory to create the provider
			const provider = LLMFactory.createProviderFromEnv(type, this.logger);
			this.logger.debug(`Successfully created ${type} provider`);
			return provider;
		} catch (error) {
			this.logger.error(`Error creating ${type} provider:`, ensureError(error));
			throw error;
		}
	}

	/**
	 * Initialize all supported providers
	 */
	public async initializeAllProviders(): Promise<void> {
		this.logger.debug('Initializing all providers...');

		// Always try to initialize the default provider first
		this.logger.info(`Attempting to initialize default provider: ${this.defaultProvider}`);
		const defaultInitialized = await this.initializeProvider(this.defaultProvider);

		if (!defaultInitialized) {
			this.logger.warn(`Failed to initialize default provider ${this.defaultProvider}, will try other providers`);
		}

		// Initialize other providers
		for (const type of Object.values(LLMProviderType)) {
			if (type !== this.defaultProvider) {
				this.logger.debug(`Attempting to initialize provider: ${type}`);
				await this.initializeProvider(type as LLMProviderType);
			}
		}

		// Log final provider status
		this.logger.info(
			'Provider initialization complete. Available providers:',
			Array.from(this.providers.keys()).join(', ') || 'None',
		);
	}

	/**
	 * Get a provider
	 * @param type Provider type
	 */
	public getProvider(type: LLMProviderType): LLMProvider | undefined {
		return this.providers.get(type);
	}

	/**
	 * Get the default provider
	 */
	public getDefaultProvider(): LLMProvider | undefined {
		this.logger.debug(`Getting default provider: ${this.defaultProvider}`);
		this.logger.debug(`Providers: ${JSON.stringify(this.providers)}`);
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
	 * Create a completion using a provider
	 * @param options Completion options
	 * @param fallbackOptions Additional options for fallback handling
	 */
	public async createCompletion(
		options: LLMCompletionOptions,
		fallbackOptions?: { useOpenAiFallback?: boolean },
	): Promise<LLMCompletion> {
		// Parse the args
		const useOpenAiFallback = fallbackOptions?.useOpenAiFallback ?? true;
		// Parse provider from options or use default
		const requestedProviderType = options.provider || this.defaultProvider;

		try {
			// Try the primary provider
			const provider = this.getProvider(requestedProviderType);
			if (!provider) {
				this.logger.warn(`Provider ${requestedProviderType} not found, using default`);
				throw new ProviderNotAvailableError(requestedProviderType);
			}

			return await provider.createCompletion(options);
		} catch (error) {
			this.logger.error(`Error with provider ${requestedProviderType}:`, ensureError(error));

			// Handle fallback to OpenAI if Ollama is not available
			if (
				useOpenAiFallback &&
				requestedProviderType === LLMProviderType.OLLAMA &&
				this.isProviderAvailable(LLMProviderType.OPENAI)
			) {
				this.logger.info('Falling back to OpenAI provider');

				// Make a copy of the options to modify for OpenAI
				const openAiOptions: LLMCompletionOptions = {
					...options,
					model: 'gpt-3.5-turbo', // Always use a safe default
					provider: LLMProviderType.OPENAI,
				};

				try {
					const openAiProvider = this.getProvider(LLMProviderType.OPENAI);
					if (!openAiProvider) {
						throw new ProviderNotAvailableError(LLMProviderType.OPENAI);
					}
					return await openAiProvider.createCompletion(openAiOptions);
				} catch (fallbackError) {
					this.logger.error('Error with OpenAI fallback:', ensureError(fallbackError));
					throw new Error(
						`Failed to create completion with primary and fallback providers: ${ensureError(error).message}, ${ensureError(fallbackError).message}`,
					);
				}
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
		options: PromptCompletionOptions = {},
	): Promise<string> {
		const messages = formatPromptMessages(promptType, userMessage);
		const defaultOptions = getPromptDefaultOptions(promptType);

		const completionOptions: LLMCompletionOptions = {
			messages,
			temperature: options.temperature ?? defaultOptions.temperature,
			maxTokens: options.maxTokens ?? defaultOptions.maxTokens,
			contextData: options.contextData,
		};

		try {
			const completion = await this.createCompletion(completionOptions);
			return completion.content;
		} catch (error) {
			if (options.fallbackToDefault) {
				this.logger.warn(
					`[LLMManager] Failed to get completion, falling back to default provider: ${ensureError(error).message}`,
				);
				const fallbackCompletion = await this.createCompletionWithDefaultProvider(completionOptions);
				return fallbackCompletion.content;
			}
			throw error;
		}
	}

	private async createCompletionWithDefaultProvider(options: LLMCompletionOptions): Promise<LLMCompletion> {
		const provider = this.getProvider(this.defaultProvider);
		if (!provider) {
			throw new Error(`Default provider ${this.defaultProvider} not available`);
		}

		const defaultModel = provider.getAvailableModels()[0];
		if (!defaultModel) {
			throw new Error(`No models available for provider ${this.defaultProvider}`);
		}

		return provider.createCompletion({
			...options,
			model: defaultModel,
		});
	}

	public registerProvider(type: LLMProviderType, provider: LLMProvider): void {
		this.providers.set(type, provider);
	}
}
