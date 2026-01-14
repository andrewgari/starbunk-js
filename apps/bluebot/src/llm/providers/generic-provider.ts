import { BaseLLMProvider } from './base-provider';
import { LLMCompletionOptions } from '../types/llm-completion-options';
import { LLMCompletionResponse } from '../types/llm-completion-response';
import { logger } from '@/observability/logger';

export abstract class GenericProvider extends BaseLLMProvider {
	protected abstract callProviderAPI(options: LLMCompletionOptions): Promise<unknown>;
	protected abstract parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse;

	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.isInitialized()) {
			throw new Error(`${this.constructor.name} is not initialized`);
		}

		try {
			const rawResponse = await this.callProviderAPI(options);
			logger.debug(`Raw response from ${this.constructor.name}:`, { rawResponse });
			return this.parseProviderResponse(rawResponse, options);
		} catch (error: Error | unknown) {
			logger.error(`Error in ${this.constructor.name}:`, error);
			throw error;
		}
	}
}
