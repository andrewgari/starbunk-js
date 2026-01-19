/**
 * LLM Provider Interface
 * 
 * Defines the contract for LLM providers (Ollama, Gemini, OpenAI).
 * All providers must implement this interface for consistent usage.
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
    options: LlmCompletionOptions
  ): Promise<LlmCompletionResult>;
}

/**
 * Configuration for LLM providers
 */
export interface LlmProviderConfig {
  // Ollama
  ollamaApiUrl?: string;
  ollamaDefaultModel?: string;

  // Gemini
  geminiApiKey?: string;
  geminiDefaultModel?: string;

  // OpenAI
  openaiApiKey?: string;
  openaiDefaultModel?: string;
}

