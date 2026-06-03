/**
 * LLM Provider Manager — singular provider orchestrator.
 *
 * Wraps a single configured LlmProvider implementation.
 * All completions use this provider; no fallback is attempted.
 */

import { logLayer } from '../../observability/log-layer';
import {
  LlmProvider,
  LlmProviderConfig,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
} from './llm-provider';
import { GenericLlmProvider } from './generic-provider';

const logger = logLayer.withPrefix('LlmProviderManager');

export class LlmProviderManager {
  private provider: LlmProvider | null = null;

  constructor(config?: LlmProviderConfig) {
    this.initializeProvider(config);
  }

  /**
   * Initialize the single configured provider
   */
  private initializeProvider(config?: LlmProviderConfig): void {
    if (!config || !config.provider) {
      logger.warn('No LLM provider configured! LLM features will not work.');
      return;
    }

    const provider = new GenericLlmProvider(
      config.provider,
      config.apiKey || config.url,
      config.defaultModel,
    );

    if (provider.isAvailable()) {
      this.provider = provider;
      logger.info(`${config.provider} provider registered`);
    } else {
      logger.warn(`Configured provider ${config.provider} is not available (missing url/apiKey).`);
    }
  }

  /**
   * Get the primary provider
   */
  getPrimaryProvider(): LlmProvider | undefined {
    return this.provider || undefined;
  }

  /**
   * Get all available providers (returns an array of 1 or 0 for backward compatibility)
   */
  getProviders(): LlmProvider[] {
    return this.provider ? [this.provider] : [];
  }

  /**
   * Generate completion
   */
  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (!this.provider) {
      throw new Error('No LLM provider available');
    }

    try {
      logger.withMetadata({ provider: this.provider.name }).debug('Attempting LLM completion');
      return await this.provider.generateCompletion(messages, options);
    } catch (error) {
      const lastError = error instanceof Error ? error : new Error(String(error));
      logger
        .withError(lastError)
        .withMetadata({
          provider: this.provider.name,
        })
        .error('Provider failed');
      throw lastError;
    }
  }

  /**
   * Check if the provider is available
   */
  hasAvailableProvider(): boolean {
    return this.provider !== null;
  }
}
