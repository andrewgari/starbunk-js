import { LLMRequest } from './llm-request';
import { LLMResponse } from './llm-response';

export interface LLMProvider {
	generate(request: LLMRequest): Promise<LLMResponse>;
}
