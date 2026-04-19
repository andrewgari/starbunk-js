/**
 * LLM Provider Manager — multi-provider orchestrator with automatic fallback.
 *
 * Maintains an ordered list of LlmProvider implementations. On each completion
 * request, it tries providers in priority order and returns the first success.
 * If a provider fails, the error is logged and the next provider is tried.
 * If all providers fail, the last error is re-thrown.
 *
 * Default priority (set at construction time):
 *   1. OllamaProvider    — local, free, private (primary)
 *   2. AnthropicProvider — Claude models
 *   3. GeminiProvider    — Google Gemini models
 *   4. OpenAIProvider    — OpenAI / legacy CLOUD_LLM_API_KEY (final fallback)
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
import { AnthropicProvider } from './anthropic-provider';
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
    // 1. Ollama (local, free, private)
    const ollama = new OllamaProvider(
      config?.ollamaBaseUrl || config?.localLlmApiKey,
      config?.ollamaDefaultModel || config?.localLlmDefaultModel,
    );
    if (ollama.isAvailable()) {
      this.providers.push(ollama);
      logger.info('Ollama provider registered');
    }

    // 2. Anthropic / Claude
    const anthropic = new AnthropicProvider(config?.anthropicApiKey, config?.anthropicDefaultModel);
    if (anthropic.isAvailable()) {
      this.providers.push(anthropic);
      logger.info('Anthropic provider registered');
    }

    // 3. Google Gemini
    const gemini = new GeminiProvider(config?.geminiApiKey, config?.geminiDefaultModel);
    if (gemini.isAvailable()) {
      this.providers.push(gemini);
      logger.info('Gemini provider registered');
    }

    // 4. OpenAI (legacy fallback via OPENAI_API_KEY or CLOUD_LLM_API_KEY)
    const openai = new OpenAIProvider(
      config?.openaiApiKey || config?.cloudLlmApiKey,
      config?.openaiDefaultModel || config?.cloudLlmDefaultModel,
    );
    if (openai.isAvailable()) {
      this.providers.push(openai);
      logger.info('OpenAI provider registered');
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
