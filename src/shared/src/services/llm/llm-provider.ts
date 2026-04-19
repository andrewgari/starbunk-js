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
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  content: string;
  model: string;
  tokensUsed?: number;
  provider: string;
}

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
 * The naming follows the env-var convention used by CovaBot:
 *   - `localLlmApiKey`      → LOCAL_LLM_API_KEY  (Ollama base URL, e.g. http://127.0.0.1:11434)
 *   - `localLlmDefaultModel`→ LOCAL_LLM_DEFAULT_MODEL
 *   - `cloudLlmApiKey`      → CLOUD_LLM_API_KEY  (OpenAI API key)
 *   - `cloudLlmDefaultModel`→ CLOUD_LLM_DEFAULT_MODEL
 *
 * Fields are optional — providers whose key/URL is absent will be skipped.
 */
export interface LlmProviderConfig {
  localLlmApiKey?: string;
  localLlmDefaultModel?: string;
  cloudLlmApiKey?: string;
  cloudLlmDefaultModel?: string;
}
