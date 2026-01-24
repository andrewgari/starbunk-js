import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BotStateManager, FrequencyOverride } from '@/reply-bots/services/bot-state-manager';

// Mock the logger
vi.mock('@/observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    withMetadata: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Mock the trace service
vi.mock('@starbunk/shared/observability/trace-service', () => ({
  getTraceService: () => ({
    startSpan: vi.fn(() => ({})),
    endSpan: vi.fn(),
    addAttributes: vi.fn(),
    addEvent: vi.fn(),
  }),
}));

describe('BotStateManager - Enable/Disable', () => {
  beforeEach(() => {
    // Reset singleton between tests
    (BotStateManager as any).instance = null;
  });

  it('should enable a bot', () => {
    const manager = BotStateManager.getInstance();
    manager.enableBot('test-bot');
    expect(manager.isBotEnabled('test-bot')).toBe(true);
  });

  it('should disable a bot', () => {
    const manager = BotStateManager.getInstance();
    manager.disableBot('test-bot');
    expect(manager.isBotEnabled('test-bot')).toBe(false);
  });

  it('should default to enabled if bot not set', () => {
    const manager = BotStateManager.getInstance();
    expect(manager.isBotEnabled('unknown-bot')).toBe(true);
  });

  it('should get all bot states', () => {
    const manager = BotStateManager.getInstance();
    manager.enableBot('bot1');
    manager.disableBot('bot2');
    const states = manager.getAllStates();
    expect(states.get('bot1')).toBe(true);
    expect(states.get('bot2')).toBe(false);
  });
});

describe('BotStateManager - Frequency Overrides', () => {
  beforeEach(() => {
    (BotStateManager as any).instance = null;
  });

  it('should set a frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('guy-bot', 50, 'admin-123', 100);
    expect(manager.getFrequency('guy-bot')).toBe(50);
  });

  it('should clamp frequency to 0-100 range', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('bot1', -10, 'admin-123');
    expect(manager.getFrequency('bot1')).toBe(0);

    manager.setFrequency('bot2', 150, 'admin-123');
    expect(manager.getFrequency('bot2')).toBe(100);
  });

  it('should track original frequency on first override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 50, 'admin-123', 25);
    expect(manager.getOriginalFrequency('test-bot')).toBe(25);
  });

  it('should preserve original frequency on subsequent overrides', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 50, 'admin-123', 25);
    manager.setFrequency('test-bot', 75, 'admin-456');
    expect(manager.getOriginalFrequency('test-bot')).toBe(25);
    expect(manager.getFrequency('test-bot')).toBe(75);
  });

  it('should default original frequency to 100 if not provided', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 50, 'admin-123');
    expect(manager.getOriginalFrequency('test-bot')).toBe(100);
  });

  it('should reset frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 50, 'admin-123', 100);
    const result = manager.resetFrequency('test-bot');
    expect(result).toBe(true);
    expect(manager.getFrequency('test-bot')).toBeUndefined();
  });

  it('should return false when resetting non-existent override', () => {
    const manager = BotStateManager.getInstance();
    const result = manager.resetFrequency('unknown-bot');
    expect(result).toBe(false);
  });

  it('should return undefined for non-existent frequency', () => {
    const manager = BotStateManager.getInstance();
    expect(manager.getFrequency('unknown-bot')).toBeUndefined();
  });

  it('should return undefined for original frequency of non-existent override', () => {
    const manager = BotStateManager.getInstance();
    expect(manager.getOriginalFrequency('unknown-bot')).toBeUndefined();
  });

  it('should check if bot has frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('bot1', 50, 'admin-123');
    expect(manager.hasFrequencyOverride('bot1')).toBe(true);
    expect(manager.hasFrequencyOverride('bot2')).toBe(false);
  });

  it('should get all frequency overrides', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('bot1', 50, 'admin-123', 100);
    manager.setFrequency('bot2', 25, 'admin-456', 75);

    const overrides = manager.getAllFrequencies();
    expect(overrides.size).toBe(2);
    expect(overrides.get('bot1')?.currentFrequency).toBe(50);
    expect(overrides.get('bot2')?.currentFrequency).toBe(25);
  });

  it('should store metadata in frequency override', () => {
    const manager = BotStateManager.getInstance();
    const now = new Date().toISOString();
    manager.setFrequency('test-bot', 50, 'admin-user-id', 100);

    const override = manager.getAllFrequencies().get('test-bot');
    expect(override).toBeDefined();
    expect(override!.botName).toBe('test-bot');
    expect(override!.currentFrequency).toBe(50);
    expect(override!.originalFrequency).toBe(100);
    expect(override!.setBy).toBe('admin-user-id');
    expect(override!.setAt).toBeDefined();
    // Check that setAt is a valid ISO string (within last second)
    const setTime = new Date(override!.setAt).getTime();
    const nowTime = new Date(now).getTime();
    expect(Math.abs(setTime - nowTime)).toBeLessThan(1000);
  });
});

describe('BotStateManager - Edge Cases', () => {
  beforeEach(() => {
    (BotStateManager as any).instance = null;
  });

  it('should handle 0% frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 0, 'admin-123');
    expect(manager.getFrequency('test-bot')).toBe(0);
  });

  it('should handle 100% frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 100, 'admin-123');
    expect(manager.getFrequency('test-bot')).toBe(100);
  });

  it('should handle multiple bot overrides independently', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('bot1', 25, 'admin-123');
    manager.setFrequency('bot2', 75, 'admin-456');
    manager.setFrequency('bot3', 50, 'admin-789');

    expect(manager.getFrequency('bot1')).toBe(25);
    expect(manager.getFrequency('bot2')).toBe(75);
    expect(manager.getFrequency('bot3')).toBe(50);
  });

  it('should allow resetting and re-overriding same bot', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 50, 'admin-123', 100);
    manager.resetFrequency('test-bot');
    manager.setFrequency('test-bot', 75, 'admin-456', 100);

    expect(manager.getFrequency('test-bot')).toBe(75);
    expect(manager.getOriginalFrequency('test-bot')).toBe(100);
  });

  it('should handle decimal frequency values', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 33.33, 'admin-123');
    expect(manager.getFrequency('test-bot')).toBe(33.33);
  });

  it('should be singleton instance', () => {
    const manager1 = BotStateManager.getInstance();
    const manager2 = BotStateManager.getInstance();
    expect(manager1).toBe(manager2);
  });
});
