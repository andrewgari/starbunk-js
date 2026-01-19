/**
 * Tests for EmbeddingManager scheduled updates integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingManager } from '../../../src/services/llm/embedding-manager';

describe('EmbeddingManager - Scheduling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Mock Ollama to be available
    process.env.OLLAMA_API_URL = 'http://localhost:11434';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create embedding manager', () => {
    const manager = new EmbeddingManager();
    expect(manager).toBeDefined();
  });

  it('should have model manager when Ollama is configured', () => {
    const manager = new EmbeddingManager({
      ollamaApiUrl: 'http://localhost:11434',
    });

    const modelManager = manager.getModelManager();
    expect(modelManager).not.toBeNull();
  });

  it('should start scheduled updates without error', () => {
    const manager = new EmbeddingManager({
      ollamaApiUrl: 'http://localhost:11434',
    });

    expect(() => {
      manager.startScheduledUpdates();
    }).not.toThrow();

    manager.stopScheduledUpdates();
  });

  it('should stop scheduled updates without error', () => {
    const manager = new EmbeddingManager({
      ollamaApiUrl: 'http://localhost:11434',
    });

    manager.startScheduledUpdates();

    expect(() => {
      manager.stopScheduledUpdates();
    }).not.toThrow();
  });

  it('should accept additional models for scheduled updates', () => {
    const manager = new EmbeddingManager({
      ollamaApiUrl: 'http://localhost:11434',
    });

    expect(() => {
      manager.startScheduledUpdates(['extra-model-1', 'extra-model-2']);
    }).not.toThrow();

    manager.stopScheduledUpdates();
  });

  it('should handle trigger update when no models registered', async () => {
    const manager = new EmbeddingManager({
      ollamaApiUrl: 'http://localhost:11434',
    });

    // Don't start scheduled updates, so no models registered
    const results = await manager.triggerModelUpdate();
    expect(results).toEqual([]);
  });
});

