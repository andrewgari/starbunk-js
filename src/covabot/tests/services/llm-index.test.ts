import { describe, it, expect } from 'vitest';
// Import through covabot LLM barrel to exercise re-exports
import * as LlmModule from '../../src/services/llm';

describe('LLM index re-exports', () => {
  it('exposes provider/embedding managers from shared', () => {
    // Presence checks – classes/functions should be defined
    expect(LlmModule).toHaveProperty('EmbeddingManager');
    expect(LlmModule).toHaveProperty('LlmProviderManager');
    expect(LlmModule).toHaveProperty('OpenAIProvider');
    expect(LlmModule).toHaveProperty('GeminiProvider');
    expect(LlmModule).toHaveProperty('OllamaProvider');
  });
});
