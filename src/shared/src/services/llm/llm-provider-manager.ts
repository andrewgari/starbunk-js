/**
 * LLM Provider Manager — multi-provider orchestrator with automatic fallback.
 *
 * Maintains an ordered list of LlmProvider implementations. On each completion
 * request, it tries providers in priority order and returns the first success.
 * If a provider fails, the error is logged and the next provider is tried.
 * If all providers fail, the last error is re-thrown.
 *
 * Default priority (set at construction time):
 *   1. OllamaProvider  — local, free, private (primary)
 *   2. OpenAIProvider  — cloud, paid (fallback)
 *
 * Only providers whose isAvailable() returns true at construction time are
 * registered, so unconfigured providers are silently skipped.
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
    // 1. Local LLM (primary - local, free, private)
    const local = new OllamaProvider(config?.localLlmApiKey, config?.localLlmDefaultModel);
    if (local.isAvailable()) {
      this.providers.push(local);
      logger.info('Local LLM provider registered (primary)');
    }

    // 2. Cloud LLM (fallback - paid)
    const cloud = new OpenAIProvider(config?.cloudLlmApiKey, config?.cloudLlmDefaultModel);
    if (cloud.isAvailable()) {
      this.providers.push(cloud);
      logger.info('Cloud LLM provider registered (fallback)');
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
