import { LLMService } from "@/llm/llm-service";
import { LLMMessage } from "../types/llm-message";
import { LLMCompletionOptions } from "../types/llm-completion-options";
import { LLMCompletionResponse } from "../types/llm-completion-response";
export abstract class BaseLLMProvider implements LLMService {
  protected initialized = false;

  public async createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: LLMMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await this.createCompletion({
      model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash-lite',
      messages,
    });
    return response.content;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public abstract initialize(): Promise<boolean>;
  public abstract getProviderName(): string;
  public abstract getAvailableModels(): string[];
  public abstract createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse>;
}

