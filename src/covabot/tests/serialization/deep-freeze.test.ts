import { describe, it, expect } from 'vitest';
import { deepFreeze } from '../../src/serialization/deep-freeze';

describe('deep-freeze', () => {
  describe('deepFreeze', () => {
    it('should freeze a simple object', () => {
      const obj = { a: 1, b: 2 };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(frozen).toBe(obj); // Same reference
    });

    it('should freeze nested objects', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.level1)).toBe(true);
      expect(Object.isFrozen(frozen.level1.level2)).toBe(true);
      expect(Object.isFrozen(frozen.level1.level2.level3)).toBe(true);
    });

    it('should freeze arrays', () => {
      const obj = {
        items: [1, 2, 3],
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.items)).toBe(true);
    });

    it('should freeze objects inside arrays', () => {
      const obj = {
        items: [{ id: 1 }, { id: 2 }],
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.items[0])).toBe(true);
      expect(Object.isFrozen(frozen.items[1])).toBe(true);
    });

    it('should freeze deeply nested arrays', () => {
      const obj = {
        matrix: [
          [{ value: 1 }, { value: 2 }],
          [{ value: 3 }, { value: 4 }],
        ],
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.matrix)).toBe(true);
      expect(Object.isFrozen(frozen.matrix[0])).toBe(true);
      expect(Object.isFrozen(frozen.matrix[0][0])).toBe(true);
    });

    it('should return primitives unchanged', () => {
      expect(deepFreeze(42)).toBe(42);
      expect(deepFreeze('string')).toBe('string');
      expect(deepFreeze(true)).toBe(true);
      expect(deepFreeze(null)).toBe(null);
      expect(deepFreeze(undefined)).toBe(undefined);
    });

    it('should prevent property modification', () => {
      const obj = { name: 'original' };
      const frozen = deepFreeze(obj);

      expect(() => {
        (frozen as { name: string }).name = 'modified';
      }).toThrow();
    });

    it('should prevent adding new properties', () => {
      const obj = { existing: 'value' };
      const frozen = deepFreeze(obj);

      expect(() => {
        (frozen as Record<string, unknown>).newProp = 'new';
      }).toThrow();
    });

    it('should prevent deleting properties', () => {
      const obj = { toDelete: 'value' };
      const frozen = deepFreeze(obj);

      expect(() => {
        delete (frozen as Record<string, unknown>).toDelete;
      }).toThrow();
    });

    it('should prevent nested property modification', () => {
      const obj = {
        nested: {
          value: 'original',
        },
      };
      const frozen = deepFreeze(obj);

      expect(() => {
        frozen.nested.value = 'modified';
      }).toThrow();
    });

    it('should prevent array mutation', () => {
      const obj = {
        items: [1, 2, 3],
      };
      const frozen = deepFreeze(obj);

      expect(() => {
        frozen.items.push(4);
      }).toThrow();

      expect(() => {
        frozen.items[0] = 99;
      }).toThrow();
    });

    it('should handle empty objects', () => {
      const obj = {};
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should handle empty arrays', () => {
      const obj = { items: [] };
      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen.items)).toBe(true);
    });

    it('should handle mixed content', () => {
      const obj = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 'two', { three: 3 }],
        nested: {
          deep: {
            value: 'deep value',
          },
        },
      };

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.array)).toBe(true);
      expect(Object.isFrozen(frozen.array[2])).toBe(true);
      expect(Object.isFrozen(frozen.nested)).toBe(true);
      expect(Object.isFrozen(frozen.nested.deep)).toBe(true);
    });

    it('should be idempotent (freezing frozen object is safe)', () => {
      const obj = { value: 'test' };
      const frozen1 = deepFreeze(obj);
      const frozen2 = deepFreeze(frozen1);

      expect(frozen1).toBe(frozen2);
      expect(Object.isFrozen(frozen2)).toBe(true);
    });

    it('should handle objects with no prototype properties', () => {
      const obj = Object.create(null);
      obj.value = 'test';

      const frozen = deepFreeze(obj);

      expect(Object.isFrozen(frozen)).toBe(true);
    });

    it('should freeze a realistic CovaProfile-like object', () => {
      const profile = {
        id: 'test-bot',
        displayName: 'Test Bot',
        personality: {
          systemPrompt: 'You are a test bot.',
          traits: ['friendly', 'helpful'],
          speechPatterns: {
            lowercase: true,
            sarcasmLevel: 0.3,
          },
        },
        triggers: [
          {
            name: 'greeting',
            conditions: {
              any_of: [{ contains_word: 'hello' }, { contains_word: 'hi' }],
            },
          },
        ],
      };

      const frozen = deepFreeze(profile);

      // All levels should be frozen
      expect(Object.isFrozen(frozen)).toBe(true);
      expect(Object.isFrozen(frozen.personality)).toBe(true);
      expect(Object.isFrozen(frozen.personality.traits)).toBe(true);
      expect(Object.isFrozen(frozen.personality.speechPatterns)).toBe(true);
      expect(Object.isFrozen(frozen.triggers)).toBe(true);
      expect(Object.isFrozen(frozen.triggers[0])).toBe(true);
      expect(Object.isFrozen(frozen.triggers[0].conditions)).toBe(true);
      expect(Object.isFrozen(frozen.triggers[0].conditions.any_of)).toBe(true);
      expect(Object.isFrozen(frozen.triggers[0].conditions.any_of![0])).toBe(true);
    });
  });
});
