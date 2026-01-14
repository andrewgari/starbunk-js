import { describe, it, expect } from 'vitest';
import { ConditionResolver } from './condition-resolver';
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

describe('ConditionResolver', () => {
  describe('Simple Conditions', () => {
    it('should resolve contains_word condition', async () => {
      const logic = { contains_word: 'banana' };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('I love banana!');
      const message2 = createMockMessage('I love apples!');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve contains_phrase condition', async () => {
      const logic = { contains_phrase: 'hello world' };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('Say hello world to everyone');
      const message2 = createMockMessage('Say goodbye');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve from_user condition', async () => {
      const logic = { from_user: '123456789' };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('Hello', '123456789');
      const message2 = createMockMessage('Hello', '987654321');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve with_chance at 100%', async () => {
      const logic = { with_chance: 100 };
      const condition = ConditionResolver.resolve(logic);

      // Should always be true
      for (let i = 0; i < 5; i++) {
        expect(await condition({} as Message)).toBe(true);
      }
    });

    it('should resolve with_chance at 0%', async () => {
      const logic = { with_chance: 0 };
      const condition = ConditionResolver.resolve(logic);

      // Should always be false
      for (let i = 0; i < 5; i++) {
        expect(await condition({} as Message)).toBe(false);
      }
    });

    it('should resolve always condition', async () => {
      const logic = { always: true };
      const condition = ConditionResolver.resolve(logic);

      const message = createMockMessage('Any message');
      expect(await condition(message as Message)).toBe(true);
    });

    it('should resolve matches_pattern condition', async () => {
      const logic = { matches_pattern: 'test\\d+' };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('This is test123');
      const message2 = createMockMessage('This is testing');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve matches_regex condition (alias)', async () => {
      const logic = { matches_regex: 'test\\d+' };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('This is test123');
      const message2 = createMockMessage('This is testing');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });
  });

  describe('Logical Operators', () => {
    it('should resolve all_of (AND) condition', async () => {
      const logic = {
        all_of: [
          { contains_word: 'banana' },
          { contains_word: 'apple' }
        ]
      };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('I love banana and apple');
      const message2 = createMockMessage('I love banana only');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve any_of (OR) condition', async () => {
      const logic = {
        any_of: [
          { contains_word: 'banana' },
          { contains_word: 'apple' }
        ]
      };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('I love banana');
      const message2 = createMockMessage('I love apple');
      const message3 = createMockMessage('I love orange');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(true);
      expect(await condition(message3 as Message)).toBe(false);
    });

    it('should resolve none_of (NOT) condition', async () => {
      const logic = {
        none_of: [
          { contains_word: 'banana' },
          { contains_word: 'apple' }
        ]
      };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('I love orange');
      const message2 = createMockMessage('I love banana');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(false);
    });

    it('should resolve nested conditions', async () => {
      const logic = {
        all_of: [
          {
            any_of: [
              { contains_word: 'banana' },
              { contains_word: 'apple' }
            ]
          },
          { contains_word: 'fruit' }
        ]
      };
      const condition = ConditionResolver.resolve(logic);

      const message1 = createMockMessage('banana is a fruit');
      const message2 = createMockMessage('apple is a fruit');
      const message3 = createMockMessage('banana is good');
      const message4 = createMockMessage('orange is a fruit');

      expect(await condition(message1 as Message)).toBe(true);
      expect(await condition(message2 as Message)).toBe(true);
      expect(await condition(message3 as Message)).toBe(false);
      expect(await condition(message4 as Message)).toBe(false);
    });
  });

  describe('Unknown Conditions', () => {
    it('should return false for unknown condition types', async () => {
      const logic = { unknown_condition: 'test' } as any;
      const condition = ConditionResolver.resolve(logic);

      const message = createMockMessage('Any message');
      expect(await condition(message as Message)).toBe(false);
    });
  });
});

