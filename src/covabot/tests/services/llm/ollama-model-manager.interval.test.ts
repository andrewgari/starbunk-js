/**
 * Tests for OllamaModelManager update interval descriptions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaModelManager } from '@starbunk/shared/services/llm';

describe('OllamaModelManager - Interval Descriptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should describe daily interval', () => {
    const oneDay = 24 * 60 * 60 * 1000;
    const manager = new OllamaModelManager({ updateIntervalMs: oneDay });

    expect(manager.getUpdateIntervalDescription()).toBe('daily');
  });

  it('should describe weekly interval', () => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const manager = new OllamaModelManager({ updateIntervalMs: oneWeek });

    expect(manager.getUpdateIntervalDescription()).toBe('weekly');
  });

  it('should describe monthly interval', () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const manager = new OllamaModelManager({ updateIntervalMs: thirtyDays });

    expect(manager.getUpdateIntervalDescription()).toBe('monthly');
  });

  it('should describe custom interval in days', () => {
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    const manager = new OllamaModelManager({ updateIntervalMs: fiveDays });

    expect(manager.getUpdateIntervalDescription()).toBe('every 5 days');
  });

  it('should use default weekly interval', () => {
    const manager = new OllamaModelManager();
    expect(manager.getUpdateIntervalDescription()).toBe('weekly');
  });

  it('should use interval from environment variable', () => {
    const oneDay = 24 * 60 * 60 * 1000;
    process.env.OLLAMA_UPDATE_INTERVAL_MS = String(oneDay);

    const manager = new OllamaModelManager();
    expect(manager.getUpdateIntervalDescription()).toBe('daily');
  });
});

