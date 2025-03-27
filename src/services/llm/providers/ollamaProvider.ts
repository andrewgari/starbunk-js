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
		'gemma3:4b',
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
			if (data && typeof data === 'object' && 'models' in data && Array.isArray(data.models)) {
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
		this.logger.debug(`Calling Ollama API at ${this.baseUrl} with model: ${options.model}`);

		// Convert messages to Ollama format
		const messages = options.messages.map(msg => ({
			role: msg.role,
			content: msg.content
		}));

		// Prepare request body
		const requestBody: any = {
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
		
		// Add personality embedding if available
		if (options.contextData?.personalityEmbedding) {
			// Add personality embedding as context
			requestBody.context = options.contextData.personalityEmbedding;
			this.logger.debug(`Adding personality embedding with ${options.contextData.personalityEmbedding.length} dimensions to request`);
		}

		// Add retry mechanism
		const maxRetries = 3;
		let attempts = 0;
		let lastError: Error | null = null;

		while (attempts < maxRetries) {
			attempts++;
			try {
				this.logger.debug(`Attempt ${attempts}/${maxRetries} to call Ollama API`);

				// Call Ollama API
				const response = await fetch(`${this.baseUrl}/api/chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(requestBody)
				});

				// Log detailed response information
				this.logger.debug(`Ollama API response status: ${response.status} ${response.statusText}`);

				if (response.status === 404) {
					this.logger.error(`Ollama API 404 Not Found error - URL: ${this.baseUrl}/api/chat, model: ${options.model}`);

					// Try a model list request to verify API connectivity
					try {
						const modelResponse = await fetch(`${this.baseUrl}/api/tags`);
						if (modelResponse.ok) {
							const modelData = await modelResponse.json();
							this.logger.debug(`Available Ollama models: ${JSON.stringify(modelData)}`);
							this.logger.error(`Model "${options.model}" may not be available on the Ollama server`);
						} else {
							this.logger.error(`Ollama server is not responding correctly to model list request: ${modelResponse.status}`);
						}
					} catch (modelCheckError) {
						this.logger.error(`Failed to check Ollama models: ${modelCheckError instanceof Error ? modelCheckError.message : String(modelCheckError)}`);
					}

					// Fall back to a default model if specified model is not found
					if (options.model !== 'llama3') {
						this.logger.warn(`Attempting to fall back to llama3 model instead of ${options.model}`);
						requestBody.model = 'llama3';
						// Continue to the next attempt
						continue;
					}
				}

				if (!response.ok) {
					throw new Error(`Ollama API error: ${response.statusText} (${response.status})`);
				}

				// Handle the response with extra care for JSON parsing
				try {
					const contentType = response.headers.get('content-type');
					this.logger.debug(`Ollama API response content-type: ${contentType}`);

					if (contentType && contentType.includes('application/json')) {
						return await response.json() as OllamaResponse;
					} else {
						// For non-JSON responses, try to parse the text
						const responseText = await response.text();
						this.logger.debug(`Ollama API returned non-JSON response. First 100 chars: ${responseText.substring(0, 100)}`);

						try {
							// Sometimes the response might be a JSON string but with wrong content type
							return JSON.parse(responseText) as OllamaResponse;
						} catch (jsonError) {
							// If it's not parseable JSON, create a suitable response object
							this.logger.warn('Could not parse Ollama response as JSON, creating fallback response');
							// Limit length for safety
							return {
								message: {
									content: responseText.slice(0, 500)
								}
							};
						}
					}
				} catch (error) {
					this.logger.error(`Error processing Ollama API response: ${error instanceof Error ? error.message : String(error)}`);
					throw error;
				}
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logger.warn(`Attempt ${attempts}/${maxRetries} failed: ${lastError.message}`);

				// Wait before retrying (exponential backoff)
				if (attempts < maxRetries) {
					const backoffTime = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
					this.logger.debug(`Retrying in ${backoffTime}ms...`);
					await new Promise(resolve => setTimeout(resolve, backoffTime));
				}
			}
		}

		// If we got here, all attempts failed
		this.logger.error(`All ${maxRetries} attempts to call Ollama API failed`);

		// Fall back to a static response if all attempts fail
		if (lastError) {
			throw new Error(`Ollama API failed after ${maxRetries} attempts: ${lastError.message}`);
		} else {
			throw new Error(`Ollama API failed after ${maxRetries} attempts with unknown error`);
		}
	}

	/**
	 * Parse the Ollama API response
	 * @param response Ollama API response
	 * @param options Original completion options
	 */
	protected parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse {
		const ollamaResponse = response as OllamaResponse;
		const defaultModel = this.getAvailableModels()[0];

		return {
			content: ollamaResponse.message?.content || '',
			model: options.model || defaultModel,
			provider: this.getProviderName()
		};
	}
}
