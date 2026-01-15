import { describe, it, expect } from 'vitest';
import { containsWord, containsPhrase, fromUser, withChance, matchesPattern, and, or, not } from '@/reply-bots/conditions/conditions';
import { Message } from 'discord.js';

// Helper to create a mock message
function createMockMessage(content: string, authorId: string = '123456789'): Partial<Message> {
  return {
    content,
    author: {
      id: authorId,
    } as any,
  } as Partial<Message>;
}

describe('Conditions', () => {
  describe('containsWord', () => {
    it('should match when word is present', () => {
      const message = createMockMessage('I love banana!');
      const condition = containsWord('banana');

      expect(condition(message as Message)).toBe(true);
    });

    it('should not match when word is absent', () => {
      const message = createMockMessage('I love apples!');
      const condition = containsWord('banana');

      expect(condition(message as Message)).toBe(false);
    });

    it('should match case-insensitively', () => {
      const message = createMockMessage('BANANA is great');
      const condition = containsWord('banana');

      expect(condition(message as Message)).toBe(true);
    });

    it('should match whole words only', () => {
      const message = createMockMessage('I have a bananasplit');
      const condition = containsWord('banana');

      // Should NOT match because "banana" is part of "bananasplit"
      expect(condition(message as Message)).toBe(false);
    });
  });

  describe('containsPhrase', () => {
    it('should match when phrase is present', () => {
      const message = createMockMessage('This is a test message');
      const condition = containsPhrase('test message');

      expect(condition(message as Message)).toBe(true);
    });

    it('should not match when phrase is absent', () => {
      const message = createMockMessage('This is a sample text');
      const condition = containsPhrase('test message');

      expect(condition(message as Message)).toBe(false);
    });

    it('should match case-insensitively', () => {
      const message = createMockMessage('TEST MESSAGE here');
      const condition = containsPhrase('test message');

      expect(condition(message as Message)).toBe(true);
    });
  });

  describe('fromUser', () => {
    it('should match when user ID matches', () => {
      const message = createMockMessage('Hello', '123456789');
      const condition = fromUser('123456789');

      expect(condition(message as Message)).toBe(true);
    });

    it('should not match when user ID differs', () => {
      const message = createMockMessage('Hello', '987654321');
      const condition = fromUser('123456789');

      expect(condition(message as Message)).toBe(false);
    });
  });

  describe('withChance', () => {
    it('should always trigger at 100%', () => {
      const condition = withChance(100);

      // Test multiple times to be sure
      for (let i = 0; i < 10; i++) {
        expect(condition()).toBe(true);
      }
    });

    it('should never trigger at 0%', () => {
      const condition = withChance(0);

      // Test multiple times to be sure
      for (let i = 0; i < 10; i++) {
        expect(condition()).toBe(false);
      }
    });
  });

  describe('matchesPattern', () => {
    it('should match regex pattern', () => {
      const message = createMockMessage('My email is test@example.com');
      const condition = matchesPattern('[a-z]+@[a-z]+\\.[a-z]+');

      expect(condition(message as Message)).toBe(true);
    });

    it('should not match when pattern does not match', () => {
      const message = createMockMessage('No email here');
      const condition = matchesPattern('[a-z]+@[a-z]+\\.[a-z]+');

      expect(condition(message as Message)).toBe(false);
    });
  });

  describe('Logical Operators', () => {
    describe('and', () => {
      it('should return true when all conditions are true', async () => {
        const message = createMockMessage('I love banana', '123');
        const condition = and(
          containsWord('banana'),
          fromUser('123')
        );

        expect(await condition(message as Message)).toBe(true);
      });

      it('should return false when any condition is false', async () => {
        const message = createMockMessage('I love banana', '456');
        const condition = and(
          containsWord('banana'),
          fromUser('123')
        );

        expect(await condition(message as Message)).toBe(false);
      });
    });

    describe('or', () => {
      it('should return true when at least one condition is true', async () => {
        const message = createMockMessage('I love apples', '123');
        const condition = or(
          containsWord('banana'),
          fromUser('123')
        );

        expect(await condition(message as Message)).toBe(true);
      });

      it('should return false when all conditions are false', async () => {
        const message = createMockMessage('I love apples', '456');
        const condition = or(
          containsWord('banana'),
          fromUser('123')
        );

        expect(await condition(message as Message)).toBe(false);
      });
    });

    describe('not', () => {
      it('should negate a true condition', async () => {
        const message = createMockMessage('I love banana');
        const condition = not(containsWord('banana'));

        expect(await condition(message as Message)).toBe(false);
      });

      it('should negate a false condition', async () => {
        const message = createMockMessage('I love apples');
        const condition = not(containsWord('banana'));

        expect(await condition(message as Message)).toBe(true);
      });
    });
  });
});

