/**
 * LLM Provider Manager
 *
 * Manages multiple LLM providers with fallback support.
 * Priority: Ollama (primary) -> Gemini (fallback) -> OpenAI (fallback)
 */

import { logLayer } from '../../observability/log-layer';
import {
  LlmProvider,
  LlmProviderConfig,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
} from './llm-provider';
import { OllamaProvider } from './ollama-provider';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';

const logger = logLayer.withPrefix('LlmProviderManager');

export class LlmProviderManager {
  private providers: LlmProvider[] = [];

  constructor(config?: LlmProviderConfig) {
    this.initializeProviders(config);
  }

  /**
   * Initialize providers in priority order
   */
  private initializeProviders(config?: LlmProviderConfig): void {
    // 1. Ollama (primary - local, free, private)
    const ollama = new OllamaProvider(config?.ollamaApiUrl, config?.ollamaDefaultModel);
    if (ollama.isAvailable()) {
      this.providers.push(ollama);
      logger.info('Ollama provider registered (primary)');
    }

    // 2. Gemini (first fallback - free tier available)
    const gemini = new GeminiProvider(config?.geminiApiKey, config?.geminiDefaultModel);
    if (gemini.isAvailable()) {
      this.providers.push(gemini);
      logger.info('Gemini provider registered (fallback)');
    }

    // 3. OpenAI (second fallback - paid)
    const openai = new OpenAIProvider(config?.openaiApiKey, config?.openaiDefaultModel);
    if (openai.isAvailable()) {
      this.providers.push(openai);
      logger.info('OpenAI provider registered (fallback)');
    }

    if (this.providers.length === 0) {
      logger.warn('No LLM providers configured! LLM features will not work.');
    } else {
      logger
        .withMetadata({
          providers: this.providers.map(p => p.name),
          primary: this.providers[0]?.name,
        })
        .info('LLM providers initialized');
    }
  }

  /**
   * Get the primary provider (first available)
   */
  getPrimaryProvider(): LlmProvider | undefined {
    return this.providers[0];
  }

  /**
   * Get all available providers
   */
  getProviders(): LlmProvider[] {
    return [...this.providers];
  }

  /**
   * Generate completion with automatic fallback
   */
  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (this.providers.length === 0) {
      throw new Error('No LLM providers available');
    }

    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        logger.withMetadata({ provider: provider.name }).debug('Attempting LLM completion');
        const result = await provider.generateCompletion(messages, options);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger
          .withError(lastError)
          .withMetadata({
            provider: provider.name,
          })
          .warn('Provider failed, trying next');
      }
    }

    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Check if any provider is available
   */
  hasAvailableProvider(): boolean {
    return this.providers.length > 0;
  }
}
