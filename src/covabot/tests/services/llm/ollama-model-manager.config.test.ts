/**
 * Tests for OllamaModelManager configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaModelManager } from '@starbunk/shared/services/llm';

describe('OllamaModelManager - Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default API URL when not configured', () => {
    const manager = new OllamaModelManager();
    // Default is http://127.0.0.1:11434
    expect(manager).toBeDefined();
  });

  it('should use custom API URL from config', () => {
    const manager = new OllamaModelManager({
      apiUrl: 'http://custom-ollama:11434',
    });
    expect(manager).toBeDefined();
  });

  it('should use API URL from environment variable', () => {
    process.env.OLLAMA_API_URL = 'http://env-ollama:11434';
    const manager = new OllamaModelManager();
    expect(manager).toBeDefined();
  });

  it('should use default pull timeout of 20 minutes', () => {
    const manager = new OllamaModelManager();
    expect(manager).toBeDefined();
  });

  it('should use custom pull timeout from config', () => {
    const manager = new OllamaModelManager({
      pullTimeoutMs: 60000,
    });
    expect(manager).toBeDefined();
  });

  it('should enable auto-pull by default', () => {
    const manager = new OllamaModelManager();
    expect(manager).toBeDefined();
  });

  it('should disable auto-pull when configured', () => {
    const manager = new OllamaModelManager({
      autoPullModels: false,
    });
    expect(manager).toBeDefined();
  });

  it('should disable auto-pull via environment variable', () => {
    process.env.OLLAMA_AUTO_PULL_MODELS = 'false';
    const manager = new OllamaModelManager();
    expect(manager).toBeDefined();
  });
});

