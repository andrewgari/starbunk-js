import { BaseLLMProvider } from './baseLlmProvider';
import { LLMCompletionOptions, LLMCompletionResponse } from './llmService';

/**
 * Generic provider implementation with common patterns
 */
export abstract class GenericProvider extends BaseLLMProvider {
	/**
	 * Call the provider-specific API
	 * @param options Completion options
	 */
	protected abstract callProviderAPI(options: LLMCompletionOptions): Promise<unknown>;

	/**
	 * Parse the provider-specific response
	 * @param response Provider response
	 * @param options Original completion options
	 */
	protected abstract parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse;

	/**
	 * Create a completion
	 * @param options Completion options
	 */
	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.isInitialized()) {
			throw new Error(`${this.getProviderName()} provider not initialized`);
		}

		try {
			// Call the provider-specific API
			const response = await this.callProviderAPI(options);

			// Parse the provider-specific response
			return this.parseProviderResponse(response, options);
		} catch (error) {
			this.logger.error(`Error calling ${this.getProviderName()} API`, error as Error);
			throw error;
		}
	}
}
