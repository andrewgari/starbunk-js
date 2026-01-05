import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GenericProvider } from '../genericProvider';
import { LLMCompletionOptions, LLMCompletionResponse, LLMServiceConfig } from '../llmService';

/**
 * Gemini provider implementation using Google's Generative AI SDK
 */
export class GeminiProvider extends GenericProvider {
	private client: GoogleGenerativeAI | null = null;
	private model: GenerativeModel | null = null;
	private availableModels: string[] = [
		'gemini-2.0-flash-exp',
		'gemini-1.5-flash',
		'gemini-1.5-flash-8b',
		'gemini-1.5-pro',
	];

	constructor(config: LLMServiceConfig) {
		super(config);
	}

	/**
	 * Initialize the Gemini provider
	 */
	protected async initializeProvider(): Promise<boolean> {
		if (!this.config.apiKey) {
			throw new Error('Gemini API key not found in configuration');
		}

		this.client = new GoogleGenerativeAI(this.config.apiKey);

		// Initialize the model
		const modelName = this.config.defaultModel || 'gemini-2.0-flash-exp';
		this.model = this.client.getGenerativeModel({ model: modelName });

		this.logger.debug(`Gemini client initialized successfully with model: ${modelName}`);
		return true;
	}

	/**
	 * Get the provider name
	 */
	public getProviderName(): string {
		return 'Gemini';
	}

	/**
	 * Get available models
	 */
	public getAvailableModels(): string[] {
		return this.availableModels;
	}

	/**
	 * Call the Gemini API
	 * @param options Completion options
	 */
	protected async callProviderAPI(options: LLMCompletionOptions): Promise<any> {
		if (!this.client || !this.model) {
			throw new Error('Gemini client not initialized');
		}

		// Build the prompt from messages
		let prompt = '';
		const systemMessages: string[] = [];
		const userMessages: string[] = [];

		for (const msg of options.messages) {
			if (msg.role === 'system') {
				systemMessages.push(msg.content);
			} else if (msg.role === 'user') {
				userMessages.push(msg.content);
			} else if (msg.role === 'assistant') {
				// For assistant messages, we'll include them as context
				userMessages.push(`Assistant: ${msg.content}`);
			}
		}

		// Combine system messages and user messages
		if (systemMessages.length > 0) {
			prompt = systemMessages.join('\n\n') + '\n\n';
		}
		prompt += userMessages.join('\n\n');

		this.logger.debug(`Calling Gemini API with model: ${options.model || this.config.defaultModel}`);

		// Generate content
		const result = await this.model.generateContent(prompt);
		const response = await result.response;

		return {
			text: response.text(),
			model: options.model || this.config.defaultModel,
		};
	}

	/**
	 * Parse the Gemini API response
	 * @param response Gemini API response
	 * @param options Original completion options
	 */
	protected parseProviderResponse(response: any, options: LLMCompletionOptions): LLMCompletionResponse {
		const defaultModel = this.getAvailableModels()[0];

		return {
			content: response.text || '',
			model: options.model || defaultModel,
			provider: this.getProviderName(),
		};
	}
}
