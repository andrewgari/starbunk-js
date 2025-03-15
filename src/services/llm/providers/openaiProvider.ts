import OpenAI from 'openai';
import { BaseLLMProvider } from '../baseLlmProvider';
import { LLMCompletionOptions, LLMCompletionResponse, LLMServiceConfig } from '../llmService';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
	private client: OpenAI | null = null;
	private availableModels: string[] = [
		'gpt-4o',
		'gpt-4o-mini',
		'gpt-4-turbo',
		'gpt-4',
		'gpt-3.5-turbo'
	];

	constructor(config: LLMServiceConfig) {
		super(config);
	}

	/**
	 * Initialize the OpenAI provider
	 */
	protected async initializeProvider(): Promise<boolean> {
		try {
			if (!this.config.apiKey) {
				this.logger.error('OpenAI API key not found in configuration');
				return false;
			}

			this.client = new OpenAI({
				apiKey: this.config.apiKey
			});

			this.logger.debug('OpenAI client initialized successfully');
			return true;
		} catch (error) {
			this.logger.error('Error initializing OpenAI client', error as Error);
			this.client = null;
			return false;
		}
	}

	/**
	 * Get the provider name
	 */
	public getProviderName(): string {
		return 'OpenAI';
	}

	/**
	 * Get available models
	 */
	public getAvailableModels(): string[] {
		return this.availableModels;
	}

	/**
	 * Create a completion
	 * @param options Completion options
	 */
	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		try {
			const response = await this.client.chat.completions.create({
				model: options.model,
				messages: options.messages.map(msg => ({
					role: msg.role,
					content: msg.content
				})),
				temperature: options.temperature ?? 0.7,
				max_tokens: options.maxTokens,
				top_p: options.topP,
				frequency_penalty: options.frequencyPenalty,
				presence_penalty: options.presencePenalty,
				stop: options.stop
			});

			return {
				content: response.choices[0].message.content || '',
				model: options.model,
				provider: this.getProviderName()
			};
		} catch (error) {
			this.logger.error('Error calling OpenAI API', error as Error);
			throw error;
		}
	}
}
