import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConditionResolver } from '@/reply-bots/resolvers/condition-resolver';
import { BotStateManager } from '@/reply-bots/services/bot-state-manager';
import { Message } from 'discord.js';

// Mock dependencies
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

vi.mock('@/reply-bots/conditions/conditions', () => ({
  withChance: (percent: number) => () => {
    const roll = Math.random() * 100;
    return roll <= percent;
  },
  containsWord: (word: string) => (msg: Message) => 
    msg.content.toLowerCase().includes(word.toLowerCase()),
  containsPhrase: (phrase: string) => (msg: Message) =>
    msg.content.toLowerCase().includes(phrase.toLowerCase()),
  matchesPattern: (pattern: string) => (msg: Message) =>
    new RegExp(pattern).test(msg.content),
  fromUser: (userId: string) => (msg: Message) =>
    msg.author.id === userId,
  always: () => () => true,
  and: (...conditions: Array<(m: Message) => boolean>) => (msg: Message) =>
    conditions.every(c => c(msg)),
  or: (...conditions: Array<(m: Message) => boolean>) => (msg: Message) =>
    conditions.some(c => c(msg)),
  not: (condition: (m: Message) => boolean) => (msg: Message) =>
    !condition(msg),
}));

describe('ConditionResolver - Frequency Override Integration', () => {
  beforeEach(() => {
    (BotStateManager as any).instance = null;
  });

  it('should apply frequency override to with_chance', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 100, 'admin-123'); // Always trigger

    const resolved = ConditionResolver.resolveWithMetadata(
      { with_chance: 10 },
      'test-bot'
    );

    const mockMessage = {
      content: 'test',
      author: { id: '123', bot: false },
    } as any;

    // With 100% override, condition should always be true
    const result1 = resolved.condition(mockMessage);
    expect(result1).toBe(true);

    // Verify metadata shows the effective chance
    expect(resolved.metadata.conditionDetails?.chance).toBe(100);
  });

  it('should replace with_chance with override value', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 0, 'admin-123'); // Never trigger

    const resolved = ConditionResolver.resolveWithMetadata(
      { with_chance: 100 },
      'test-bot'
    );

    const mockMessage = {
      content: 'test',
      author: { id: '123', bot: false },
    } as any;

    // With 0% override, condition should always be false
    const result1 = resolved.condition(mockMessage);
    expect(result1).toBe(false);
  });

  it('should use original with_chance when no override', () => {
    // No override set for this bot
    const resolved = ConditionResolver.resolveWithMetadata(
      { with_chance: 50 },
      'unknown-bot'
    );

    expect(resolved.metadata.conditionDetails?.chance).toBe(50);
  });

  it('should handle with_chance in nested all_of condition', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 100, 'admin-123'); // Always trigger

    const resolved = ConditionResolver.resolveWithMetadata(
      {
        all_of: [
          { always: true },
          { with_chance: 10 },
        ],
      },
      'test-bot'
    );

    const mockMessage = {
      content: 'test',
      author: { id: '123', bot: false },
    } as any;

    // With 100% override, should always be true
    const result = resolved.condition(mockMessage);
    expect(result).toBe(true);
  });

  it('should handle with_chance in nested any_of condition', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 100, 'admin-123'); // Always trigger

    const resolved = ConditionResolver.resolveWithMetadata(
      {
        any_of: [
          { always: false },
          { with_chance: 10 },
        ],
      },
      'test-bot'
    );

    const mockMessage = {
      content: 'test',
      author: { id: '123', bot: false },
    } as any;

    // With 100% override on with_chance, should be true (because of OR logic)
    const result = resolved.condition(mockMessage);
    expect(result).toBe(true);
  });

  it('should preserve other conditions alongside frequency override', () => {
    const manager = BotStateManager.getInstance();
    manager.setFrequency('test-bot', 100, 'admin-123');

    const resolved = ConditionResolver.resolveWithMetadata(
      {
        all_of: [
          { contains_phrase: 'hello' },
          { with_chance: 10 },
        ],
      },
      'test-bot'
    );

    const matchMessage = {
      content: 'hello world',
      author: { id: '123', bot: false },
    } as any;

    const noMatchMessage = {
      content: 'goodbye world',
      author: { id: '123', bot: false },
    } as any;

    // Should still check contains_phrase even with frequency override
    expect(resolved.condition(matchMessage)).toBe(true);
    expect(resolved.condition(noMatchMessage)).toBe(false);
  });

  it('should not require botName parameter', () => {
    const resolved = ConditionResolver.resolveWithMetadata({
      with_chance: 50,
    }); // No botName provided

    expect(resolved.metadata.conditionDetails?.chance).toBe(50);
  });

  it('should handle with_chance without override', () => {
    const resolved = ConditionResolver.resolveWithMetadata(
      { with_chance: 50 },
      'bot-without-override'
    );

    expect(resolved.metadata.conditionDetails?.chance).toBe(50);
  });
});

describe('ConditionResolver - Non-Frequency Conditions', () => {
  it('should resolve contains_phrase', () => {
    const resolved = ConditionResolver.resolveWithMetadata({
      contains_phrase: 'hello',
    });

    const matchMessage = {
      content: 'hello world',
      author: { id: '123', bot: false },
    } as any;

    const noMatchMessage = {
      content: 'goodbye world',
      author: { id: '123', bot: false },
    } as any;

    expect(resolved.condition(matchMessage)).toBe(true);
    expect(resolved.condition(noMatchMessage)).toBe(false);
  });

  it('should resolve from_user condition', () => {
    const resolved = ConditionResolver.resolveWithMetadata({
      from_user: 'user-123',
    });

    const matchMessage = {
      content: 'test',
      author: { id: 'user-123', bot: false },
    } as any;

    const noMatchMessage = {
      content: 'test',
      author: { id: 'user-456', bot: false },
    } as any;

    expect(resolved.condition(matchMessage)).toBe(true);
    expect(resolved.condition(noMatchMessage)).toBe(false);
  });

  it('should resolve always condition', () => {
    const resolved = ConditionResolver.resolveWithMetadata({
      always: true,
    });

    const mockMessage = {
      content: 'anything',
      author: { id: '123', bot: false },
    } as any;

    expect(resolved.condition(mockMessage)).toBe(true);
  });
});
