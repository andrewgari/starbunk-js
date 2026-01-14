import { LLMCompletionOptions } from './types/llm-completion-options';
import { LLMCompletionResponse } from './types/llm-completion-response';// packages/shared/src/services/llm/llmService.ts
export interface LLMService {
    initialize(): Promise<boolean>;
    isInitialized(): boolean;
    getProviderName(): string;
    getAvailableModels(): string[];
    createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;
    createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string>;
}
