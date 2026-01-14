import { GenericProvider } from "./providers/generic-provider";
import { LLMCompletionOptions } from "./types/llm-completion-options";
import { LLMCompletionResponse } from "./types/llm-completion-response";
import { logger } from "@/observability/logger";

export class LLMManager {
  private providers = new Map<string, GenericProvider>();

  public async getCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    const provider = this.providers.get(options.provider || 'ollama');

    try {
      return await provider!.createCompletion(options);
    } catch (error: Error | unknown) {
      logger.error(`LLM failed on ${provider}, attempting fallback...`, error);
      // Optional: Logic to try 'gemini' if 'local' fails
      return this.providers.get('gemini')!.createCompletion(options);
    }
  }
}
