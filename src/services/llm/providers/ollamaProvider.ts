import { BaseLLMProvider } from '../baseLlmProvider';
import { LLMCompletionOptions, LLMCompletionResponse, LLMServiceConfig } from '../llmService';

/**
 * Interface for Ollama model information
 */
interface OllamaModel {
	name: string;
	[key: string]: unknown;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseLLMProvider {
	private baseUrl: string;
	private availableModels: string[] = [
		'llama3',
		'llama3:8b',
		'llama3:70b',
		'mistral',
		'mixtral',
		'phi3'
	];

	constructor(config: LLMServiceConfig) {
		super(config);
		this.baseUrl = config.apiUrl || 'http://localhost:11434';
	}

	/**
	 * Initialize the Ollama provider
	 */
	protected async initializeProvider(): Promise<boolean> {
		try {
			// Test connection to Ollama API
			const response = await fetch(`${this.baseUrl}/api/tags`);

			if (!response.ok) {
				this.logger.error(`Failed to connect to Ollama API: ${response.statusText}`);
				return false;
			}

			const data = await response.json();

			// Update available models from Ollama server if possible
			if (data.models) {
				this.availableModels = data.models.map((model: OllamaModel) => model.name);
			}

			this.logger.debug('Ollama client initialized successfully');
			return true;
		} catch (error) {
			this.logger.error('Error initializing Ollama client', error as Error);
			return false;
		}
	}

	/**
	 * Get the provider name
	 */
	public getProviderName(): string {
		return 'Ollama';
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
		try {
			// Convert messages to Ollama format
			const messages = options.messages.map(msg => ({
				role: msg.role,
				content: msg.content
			}));

			// Prepare request body
			const requestBody = {
				model: options.model,
				messages,
				options: {
					temperature: options.temperature,
					top_p: options.topP,
					frequency_penalty: options.frequencyPenalty,
					presence_penalty: options.presencePenalty,
					stop: options.stop
				}
			};

			// Call Ollama API
			const response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.statusText}`);
			}

			const data = await response.json();

			return {
				content: data.message?.content || '',
				model: options.model,
				provider: this.getProviderName()
			};
		} catch (error) {
			this.logger.error('Error calling Ollama API', error as Error);
			throw error;
		}
	}
}
