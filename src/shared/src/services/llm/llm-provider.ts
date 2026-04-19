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
 * Provider priority (first configured wins, then falls back):
 *   1. Ollama   — OLLAMA_BASE_URL (no API key needed)
 *   2. Anthropic — ANTHROPIC_API_KEY
 *   3. Gemini   — GEMINI_API_KEY
 *   4. OpenAI   — OPENAI_API_KEY (legacy: CLOUD_LLM_API_KEY)
 *
 * Fields are optional — providers whose key/URL is absent will be skipped.
 */
export interface LlmProviderConfig {
  // Ollama (local, no API key required)
  ollamaBaseUrl?: string;
  ollamaDefaultModel?: string;
  // Anthropic / Claude
  anthropicApiKey?: string;
  anthropicDefaultModel?: string;
  // Google Gemini
  geminiApiKey?: string;
  geminiDefaultModel?: string;
  // OpenAI
  openaiApiKey?: string;
  openaiDefaultModel?: string;
  // Legacy aliases kept for backward compatibility
  localLlmApiKey?: string;
  localLlmDefaultModel?: string;
  cloudLlmApiKey?: string;
  cloudLlmDefaultModel?: string;
}
