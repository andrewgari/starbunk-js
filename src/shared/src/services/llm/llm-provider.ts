/**
 * Shared LLM provider interface and associated types.
 *
 * All LLM providers (Ollama, OpenAI, etc.) implement LlmProvider so callers
 * can generate completions without knowing which backend is in use.
 * LlmProviderManager selects and sequences providers; consumers only see this
 * interface and the message/result types defined here.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  content: string;
  model: string;
  tokensUsed?: number;
  provider: string;
  /**
   * The reason the model stopped generating.
   *
   * Provider-specific values:
   *   - Anthropic: 'end_turn' (normal) | 'max_tokens' (truncated) | 'stop_sequence' | 'tool_use'
   *   - Ollama:    'stop'   (normal) | 'length'     (truncated)
   *   - OpenAI:   'stop'   (normal) | 'length'     (truncated) | 'content_filter' | 'tool_calls'
   *   - Gemini:   'stop'   (normal) | 'length'     (truncated)  (via OpenAI-compat endpoint)
   *
   * 'max_tokens' or 'length' indicates the response was cut off mid-sentence.
   */
  finishReason?: string;
}

export type LlmProviderType = 'gemini' | 'ollama' | 'anthropic' | 'openai';

/**
 * Abstract LLM Provider interface
 */
export interface LlmProvider {
  /** Provider name for logging/identification */
  readonly name: string;

  /** Check if this provider is configured and available */
  isAvailable(): boolean;

  /** Generate a chat completion */
  generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult>;
}

/**
 * Configuration passed to LlmProviderManager to initialise all providers.
 *
 * Provider priority (first configured wins, then falls back):
 *   1. Gemini   — GEMINI_API_KEY (cloud; generous token limits)
 *   2. Ollama   — OLLAMA_BASE_URL (local, free, private; no API key needed)
 *   3. Anthropic — ANTHROPIC_API_KEY
 *   4. OpenAI   — OPENAI_API_KEY (legacy: CLOUD_LLM_API_KEY)
 *
 * Fields are optional — providers whose key/URL is absent will be skipped.
 */
export interface LlmProviderConfig {
  provider: LlmProviderType;
  url?: string;
  apiKey?: string;
  defaultModel?: string;
}
