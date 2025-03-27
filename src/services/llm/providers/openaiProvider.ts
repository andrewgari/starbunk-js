import OpenAI from 'openai';
import { GenericProvider } from '../genericProvider';
import { LLMCompletionOptions, LLMCompletionResponse, LLMServiceConfig } from '../llmService';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends GenericProvider {
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
	 * Call the OpenAI API
	 * @param options Completion options
	 */
	protected async callProviderAPI(options: LLMCompletionOptions): Promise<OpenAI.Chat.Completions.ChatCompletion> {
		if (!this.client) {
			throw new Error('OpenAI client not initialized');
		}

		const defaultModel = this.getAvailableModels()[0];
		if (!defaultModel) {
			throw new Error('No models available for OpenAI provider');
		}

		return await this.client.chat.completions.create({
			model: options.model || defaultModel,
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
	}

	/**
	 * Parse the OpenAI API response
	 * @param response OpenAI API response
	 * @param options Original completion options
	 */
	protected parseProviderResponse(
		response: unknown,
		options: LLMCompletionOptions
	): LLMCompletionResponse {
		const openaiResponse = response as OpenAI.Chat.Completions.ChatCompletion;
		const defaultModel = this.getAvailableModels()[0];

		return {
			content: openaiResponse.choices[0].message.content || '',
			model: options.model || defaultModel,
			provider: this.getProviderName()
		};
	}
}
