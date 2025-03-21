import { GenericProvider } from '../genericProvider';
import { LLMCompletionOptions, LLMCompletionResponse, LLMServiceConfig } from '../llmService';

/**
 * Interface for Ollama model information
 */
interface OllamaModel {
	name: string;
	[key: string]: unknown;
}

/**
 * Interface for Ollama API response
 */
interface OllamaResponse {
	message?: {
		content: string;
	};
	[key: string]: unknown;
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends GenericProvider {
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
	 * Call the Ollama API
	 * @param options Completion options
	 */
	protected async callProviderAPI(options: LLMCompletionOptions): Promise<OllamaResponse> {
		// put debug logs in this method
		this.logger.debug('Calling Ollama API with options:', options);

		// Convert messages to Ollama format
		const messages = options.messages.map(msg => ({
			role: msg.role,
			content: msg.content
		}));

		// Prepare request body
		const requestBody = {
			model: options.model,
			messages,
			// Explicitly set streaming to false
			stream: false,
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

		// Handle the response with extra care for JSON parsing
		try {
			const contentType = response.headers.get('content-type');
			this.logger.debug(`Ollama API response content-type: ${contentType}`);

			if (contentType && contentType.includes('application/json')) {
				return await response.json();
			} else {
				// For non-JSON responses, try to parse the text
				const text = await response.text();
				this.logger.debug(`Ollama API returned non-JSON response. First 100 chars: ${text.substring(0, 100)}`);

				try {
					// Sometimes the response might be a JSON string but with wrong content type
					return JSON.parse(text);
				} catch (jsonError) {
					// If it's not parseable JSON, create a suitable response object
					this.logger.warn('Could not parse Ollama response as JSON, creating fallback response');
					// Limit length for safety
					return {
						message: {
							content: text.slice(0, 500)
						}
					};
				}
			}
		} catch (error) {
			this.logger.error('Error calling Ollama API', error as Error);
			throw error;
		}
	}

	/**
	 * Parse the Ollama API response
	 * @param response Ollama API response
	 * @param options Original completion options
	 */
	protected parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse {
		const ollamaResponse = response as OllamaResponse;

		return {
			content: ollamaResponse.message?.content || '',
			model: options.model,
			provider: this.getProviderName()
		};
	}
}
