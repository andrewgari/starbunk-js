import { BaseLLMProvider } from './base-provider';
import { LLMCompletionOptions } from '../types/llm-completion-options';
import { LLMCompletionResponse } from '../types/llm-completion-response';
import { logger } from '@/observability/logger';

export abstract class GenericProvider extends BaseLLMProvider {
	protected abstract callProviderAPI(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;
	protected abstract parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse;

	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.isInitialized()) {
			throw new Error(`${this.constructor.name} is not initialized`);
		}

		try {
			const response = await this.callProviderAPI(options);
      logger.debug(`Response from ${this.constructor.name}:`, { response });
			return this.parseProviderResponse(response, options);
		} catch (error: Error | unknown) {
			logger.error(`Error in ${this.constructor.name}:`, error);
			throw error;
		}
	}
}
