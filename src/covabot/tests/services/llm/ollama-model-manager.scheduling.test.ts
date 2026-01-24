/**
 * Tests for OllamaModelManager scheduled updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaModelManager } from '@starbunk/shared/services/llm';

describe('OllamaModelManager - Scheduling', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
  });

  it('should start with no scheduled models', () => {
    const manager = new OllamaModelManager();
    expect(manager.getScheduledModels()).toEqual([]);
  });

  it('should not be running scheduled updates initially', () => {
    const manager = new OllamaModelManager();
    expect(manager.isScheduledUpdatesRunning()).toBe(false);
  });

  it('should add models when starting scheduled updates', () => {
    const manager = new OllamaModelManager();
    manager.startScheduledUpdates(['model-a', 'model-b']);

    expect(manager.getScheduledModels()).toContain('model-a');
    expect(manager.getScheduledModels()).toContain('model-b');

    manager.stopScheduledUpdates();
  });

  it('should be running after starting scheduled updates', () => {
    const manager = new OllamaModelManager();
    manager.startScheduledUpdates(['model-a']);

    expect(manager.isScheduledUpdatesRunning()).toBe(true);

    manager.stopScheduledUpdates();
  });

  it('should stop running after stopping scheduled updates', () => {
    const manager = new OllamaModelManager();
    manager.startScheduledUpdates(['model-a']);
    manager.stopScheduledUpdates();

    expect(manager.isScheduledUpdatesRunning()).toBe(false);
  });

  it('should add a model to scheduled list', () => {
    const manager = new OllamaModelManager();
    manager.addScheduledModel('new-model');

    expect(manager.getScheduledModels()).toContain('new-model');
  });

  it('should not add duplicate models', () => {
    const manager = new OllamaModelManager();
    manager.addScheduledModel('model-a');
    manager.addScheduledModel('model-a');

    const models = manager.getScheduledModels();
    const count = models.filter((m) => m === 'model-a').length;
    expect(count).toBe(1);
  });

  it('should remove a model from scheduled list', () => {
    const manager = new OllamaModelManager();
    manager.addScheduledModel('model-a');
    manager.addScheduledModel('model-b');

    const removed = manager.removeScheduledModel('model-a');

    expect(removed).toBe(true);
    expect(manager.getScheduledModels()).not.toContain('model-a');
    expect(manager.getScheduledModels()).toContain('model-b');
  });

  it('should return false when removing non-existent model', () => {
    const manager = new OllamaModelManager();
    const removed = manager.removeScheduledModel('non-existent');
    expect(removed).toBe(false);
  });

  it('should not start if scheduled updates are disabled', () => {
    process.env.OLLAMA_SCHEDULED_UPDATES = 'false';
    const manager = new OllamaModelManager();
    manager.startScheduledUpdates(['model-a']);

    expect(manager.isScheduledUpdatesRunning()).toBe(false);
  });
});

