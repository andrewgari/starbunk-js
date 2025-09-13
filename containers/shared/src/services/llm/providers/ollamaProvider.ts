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
		'phi3',
	];

	constructor(config: LLMServiceConfig) {
		super(config);
		this.baseUrl = config.apiUrl || 'http://localhost:11434';
	}

	/**
	 * Initialize the Ollama provider
	 */
	protected async initializeProvider(): Promise<boolean> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		try {
			this.logger.debug(`Attempting to connect to Ollama API at ${this.baseUrl}`);
			const response = await fetch(`${this.baseUrl}/api/tags`, {
				signal: controller.signal,
			});

			if (!response.ok) {
				this.logger.error(`Failed to connect to Ollama API: ${response.statusText} (${response.status})`);
				return false;
			}

			const data = await response.json();
			this.logger.debug('Received response from Ollama API:', data);

			// Update available models from Ollama server if possible
			if (data && typeof data === 'object' && 'models' in data && Array.isArray(data.models)) {
				this.availableModels = data.models.map((model: OllamaModel) => model.name);
				this.logger.debug('Updated available models:', this.availableModels);
			}

			this.logger.debug('Ollama client initialized successfully');
			return true;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				this.logger.error(`Ollama API connection timed out after 5 seconds: ${this.baseUrl}`);
			} else {
				this.logger.error(
					'Error connecting to Ollama API:',
					error instanceof Error ? error : new Error(String(error)),
				);
			}
			return false;
		} finally {
			clearTimeout(timeout);
		}
	}

	/**
	 * Check if provider is healthy and ready to handle requests
	 */
	public async isHealthy(): Promise<boolean> {
		try {
			const response = await fetch(`${this.baseUrl}/api/tags`);
			return response.ok;
		} catch (error) {
			this.logger.error('Health check failed', error as Error);
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
	 * Call the Ollama API using the Generate endpoint
	 * @param options Completion options
	 */
	protected async callProviderAPI(options: LLMCompletionOptions): Promise<OllamaResponse> {
		// Check health before proceeding
		if (!(await this.isHealthy())) {
			throw new Error('Ollama service is not available. Please ensure Ollama is running (`ollama serve`)');
		}

		this.logger.debug(`Calling Ollama API at ${this.baseUrl} with model: ${options.model}`);

		// Use the generate endpoint instead of chat for simpler request format
		// Extract the last message from the messages array (typically the user's query)
		const lastMessage = options.messages[options.messages.length - 1];
		let prompt = lastMessage.content;

		// If there's a system message, prepend it
		const systemMessage = options.messages.find((msg) => msg.role === 'system');
		if (systemMessage) {
			prompt = `${systemMessage.content}\n\n${prompt}`;
		}

		// Very simple request body for generate endpoint
		const requestBody = {
			model: options.model || this.config.defaultModel || 'llama3',
			prompt: prompt,
		};

		// Make sure we have a model specified
		if (!requestBody.model) {
			this.logger.warn('No model specified, defaulting to llama3');
			requestBody.model = 'llama3';
		}

		// Add retry mechanism
		const maxRetries = 3;
		let attempts = 0;
		let lastError: Error | null = null;

		while (attempts < maxRetries) {
			attempts++;
			try {
				this.logger.debug(`Attempt ${attempts}/${maxRetries} to call Ollama API`);
				this.logger.debug(`Request body: ${JSON.stringify(requestBody)}`);

				// Call Ollama API using the generate endpoint instead of chat
				const response = await fetch(`${this.baseUrl}/api/generate`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(requestBody),
				});

				// Log detailed response information
				this.logger.debug(`Ollama API response status: ${response.status} ${response.statusText}`);

				if (response.status === 404) {
					this.logger.error(
						`Ollama API 404 Not Found error - URL: ${this.baseUrl}/api/generate, model: ${options.model}`,
					);

					// Fall back to a default model if specified model is not found
					if (options.model !== 'llama3') {
						this.logger.warn(`Attempting to fall back to llama3 model instead of ${options.model}`);
						requestBody.model = 'llama3';
						// Continue to the next attempt
						continue;
					}
				}

				if (!response.ok) {
					// Try to get more error details from response body
					try {
						const errorText = await response.text();
						throw new Error(
							`Ollama API error: ${response.statusText} (${response.status}). Details: ${errorText}`,
						);
					} catch (_e) {
						throw new Error(`Ollama API error: ${response.statusText} (${response.status})`);
					}
				}

				// Handle the response
				const responseText = await response.text();
				this.logger.debug(`Ollama API response length: ${responseText.length}`);

				// Parse the response properly - Ollama /api/generate returns streaming data in JSON lines format
				let parsedContent = '';

				try {
					// The response is a sequence of JSON objects, one per line
					const lines = responseText.trim().split('\n');

					// Extract just the actual generated text from each line
					for (const line of lines) {
						try {
							const chunk = JSON.parse(line);
							if (chunk && typeof chunk === 'object' && 'response' in chunk) {
								parsedContent += chunk.response;
							}
						} catch (_parseError) {
							this.logger.warn(`Failed to parse JSON line: ${line}`);
						}
					}

					this.logger.debug(`Extracted content length: ${parsedContent.length}`);
				} catch (e) {
					this.logger.warn(
						`Error parsing Ollama generate response, using raw response: ${e instanceof Error ? e.message : String(e)}`,
					);
					parsedContent = responseText.trim().substring(0, 1500); // Fallback with truncation
				}

				// Adapt the generate response to match the expected format
				return {
					message: {
						content: parsedContent,
					},
				};
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				this.logger.warn(`Attempt ${attempts}/${maxRetries} failed: ${lastError.message}`);

				// Wait before retrying (exponential backoff)
				if (attempts < maxRetries) {
					const backoffTime = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
					this.logger.debug(`Retrying in ${backoffTime}ms...`);
					await new Promise((resolve) => setTimeout(resolve, backoffTime));
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
			provider: this.getProviderName(),
		};
	}
}
