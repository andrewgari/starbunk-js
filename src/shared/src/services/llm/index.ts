// LLM Provider Interface and Implementations
export * from './llm-provider';
export * from './llm-provider-manager';
export * from './generic-provider';
export * from './ollama-model-manager';

import { GenericLlmProvider } from './generic-provider';

/** @deprecated Use GenericLlmProvider with type 'ollama' instead */
export class OllamaProvider extends GenericLlmProvider {
  constructor(apiUrl?: string, defaultModel?: string) {
    super('ollama', apiUrl, defaultModel);
  }
}

/** @deprecated Use GenericLlmProvider with type 'anthropic' instead */
export class AnthropicProvider extends GenericLlmProvider {
  constructor(apiKey?: string, defaultModel?: string) {
    super('anthropic', apiKey, defaultModel);
  }
}

/** @deprecated Use GenericLlmProvider with type 'gemini' instead */
export class GeminiProvider extends GenericLlmProvider {
  constructor(apiKey?: string, defaultModel?: string) {
    super('gemini', apiKey, defaultModel);
  }
}

/** @deprecated Use GenericLlmProvider with type 'openai' instead */
export class OpenAIProvider extends GenericLlmProvider {
  constructor(apiKey?: string, defaultModel?: string) {
    super('openai', apiKey, defaultModel);
  }
}

// Embedding Provider Interface and Implementations
export * from './embedding-provider';
export * from './embedding-manager';
export * from './ollama-embedding-provider';
export * from './openai-embedding-provider';
