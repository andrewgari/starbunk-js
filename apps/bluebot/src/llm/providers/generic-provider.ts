import { BaseLLMProvider } from './base-provider';
import { LLMCompletionOptions } from '../types/llm-completion-options';
import { LLMCompletionResponse } from '../types/llm-completion-response';

export abstract class GenericProvider extends BaseLLMProvider {
	protected abstract callProviderAPI(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;
	protected abstract parseProvierResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse;

	public async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		if (!this.isInitialized()) {
			throw new Error(`${this.constructor.name} is not initialized`);
		}
		try {
			const response = await this.callProviderAPI(options);
			return this.parseProvierResponse(response, options);
		} catch (error: Error | unknown) {
			console.error(`Error in ${this.constructor.name}:`, error);
			throw error;
		}
	}
}
