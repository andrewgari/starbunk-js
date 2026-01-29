import { describe, it, expect } from 'vitest';
import {
  clamp,
  clamp01,
  normalizeSpeechPatterns,
  normalizeIdentity,
  normalizeCondition,
  normalizeTrigger,
  normalizeLlmConfig,
} from '../../src/serialization/normalizers';

describe('normalizers', () => {
  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp value to min when below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('should clamp value to max when above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });

    it('should return min for NaN', () => {
      expect(clamp(NaN, 0, 10)).toBe(0);
      expect(clamp(NaN, 5, 10)).toBe(5);
    });

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(0, -10, -1)).toBe(-1);
      expect(clamp(-15, -10, -1)).toBe(-10);
    });

    it('should handle floating point values', () => {
      expect(clamp(0.5, 0, 1)).toBe(0.5);
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.5, 0, 1)).toBe(0);
    });
  });

  describe('clamp01', () => {
    it('should return undefined for undefined input', () => {
      expect(clamp01(undefined)).toBeUndefined();
    });

    it('should clamp value to 0-1 range', () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(1.5)).toBe(1);
    });
  });

  describe('normalizeSpeechPatterns', () => {
    it('should normalize speech patterns with valid values', () => {
      const result = normalizeSpeechPatterns({
        lowercase: true,
        sarcasm_level: 0.5,
        technical_bias: 0.7,
      });

      expect(result).toEqual({
        lowercase: true,
        sarcasmLevel: 0.5,
        technicalBias: 0.7,
      });
    });

    it('should clamp sarcasm_level and technical_bias to 0-1', () => {
      const result = normalizeSpeechPatterns({
        lowercase: false,
        sarcasm_level: 1.5,
        technical_bias: -0.5,
      });

      expect(result.sarcasmLevel).toBe(1);
      expect(result.technicalBias).toBe(0);
    });

    it('should coerce lowercase to boolean', () => {
      const result = normalizeSpeechPatterns({
        lowercase: 1 as unknown as boolean,
        sarcasm_level: 0.3,
        technical_bias: 0.5,
      });

      expect(result.lowercase).toBe(true);
    });
  });

  describe('normalizeIdentity', () => {
    it('should normalize static identity', () => {
      const result = normalizeIdentity({
        type: 'static',
        botName: 'Test Bot',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(result).toEqual({
        type: 'static',
        botName: 'Test Bot',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });

    it('should normalize static identity without avatar', () => {
      const result = normalizeIdentity({
        type: 'static',
        botName: 'Test Bot',
      });

      expect(result).toEqual({
        type: 'static',
        botName: 'Test Bot',
        avatarUrl: undefined,
      });
    });

    it('should normalize mimic identity', () => {
      const result = normalizeIdentity({
        type: 'mimic',
        as_member: '123456789012345678',
      });

      expect(result).toEqual({
        type: 'mimic',
        as_member: '123456789012345678',
      });
    });

    it('should normalize random identity', () => {
      const result = normalizeIdentity({
        type: 'random',
      });

      expect(result).toEqual({
        type: 'random',
      });
    });
  });

  describe('normalizeCondition', () => {
    it('should normalize simple conditions', () => {
      expect(normalizeCondition({ matches_pattern: 'test.*' })).toEqual({
        matches_pattern: 'test.*',
      });

      expect(normalizeCondition({ contains_word: 'hello' })).toEqual({
        contains_word: 'hello',
      });

      expect(normalizeCondition({ contains_phrase: 'hello world' })).toEqual({
        contains_phrase: 'hello world',
      });

      expect(normalizeCondition({ from_user: '123456789' })).toEqual({
        from_user: '123456789',
      });

      expect(normalizeCondition({ always: true })).toEqual({
        always: true,
      });
    });

    it('should clamp with_chance to 0-1', () => {
      expect(normalizeCondition({ with_chance: 0.5 })).toEqual({
        with_chance: 0.5,
      });

      expect(normalizeCondition({ with_chance: 1.5 })).toEqual({
        with_chance: 1,
      });

      expect(normalizeCondition({ with_chance: -0.5 })).toEqual({
        with_chance: 0,
      });
    });

    it('should normalize nested any_of conditions', () => {
      const result = normalizeCondition({
        any_of: [{ contains_word: 'hello' }, { contains_word: 'hi' }],
      });

      expect(result).toEqual({
        any_of: [{ contains_word: 'hello' }, { contains_word: 'hi' }],
      });
    });

    it('should normalize nested all_of conditions', () => {
      const result = normalizeCondition({
        all_of: [{ from_user: '123' }, { with_chance: 0.5 }],
      });

      expect(result).toEqual({
        all_of: [{ from_user: '123' }, { with_chance: 0.5 }],
      });
    });

    it('should normalize nested none_of conditions', () => {
      const result = normalizeCondition({
        none_of: [{ contains_word: 'spam' }],
      });

      expect(result).toEqual({
        none_of: [{ contains_word: 'spam' }],
      });
    });

    it('should handle deeply nested conditions', () => {
      const result = normalizeCondition({
        any_of: [
          {
            all_of: [{ from_user: '123' }, { with_chance: 0.5 }],
          },
          { contains_word: 'hello' },
        ],
      });

      expect(result.any_of).toHaveLength(2);
      expect(result.any_of![0].all_of).toHaveLength(2);
    });

    it('should not include undefined fields', () => {
      const result = normalizeCondition({ contains_word: 'test' });

      expect(result).not.toHaveProperty('matches_pattern');
      expect(result).not.toHaveProperty('from_user');
      expect(result).not.toHaveProperty('with_chance');
    });
  });

  describe('normalizeTrigger', () => {
    it('should normalize a basic trigger', () => {
      const result = normalizeTrigger({
        name: '  greeting  ',
        conditions: { contains_word: 'hello' },
        use_llm: true,
      });

      expect(result.name).toBe('greeting');
      expect(result.conditions).toEqual({ contains_word: 'hello' });
      expect(result.use_llm).toBe(true);
    });

    it('should normalize trigger with response_chance', () => {
      const result = normalizeTrigger({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        response_chance: 0.8,
      });

      expect(result.response_chance).toBe(0.8);
    });

    it('should clamp response_chance to 0-1', () => {
      const result = normalizeTrigger({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        response_chance: 1.5,
      });

      expect(result.response_chance).toBe(1);
    });

    it('should normalize string responses', () => {
      const result = normalizeTrigger({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        responses: 'Hello!',
      });

      expect(result.responses).toBe('Hello!');
    });

    it('should normalize array responses', () => {
      const result = normalizeTrigger({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        responses: ['Hello!', 'Hi there!'],
      });

      expect(result.responses).toEqual(['Hello!', 'Hi there!']);
    });

    it('should handle undefined responses', () => {
      const result = normalizeTrigger({
        name: 'test',
        conditions: { always: true },
        use_llm: true,
      });

      expect(result.responses).toBeUndefined();
    });
  });

  describe('normalizeLlmConfig', () => {
    it('should normalize LLM config with valid values', () => {
      const result = normalizeLlmConfig({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 512,
      });

      expect(result).toEqual({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 512,
      });
    });

    it('should clamp temperature to 0-2', () => {
      expect(
        normalizeLlmConfig({
          model: 'gpt-4o',
          temperature: 3,
          max_tokens: 256,
        }).temperature,
      ).toBe(2);

      expect(
        normalizeLlmConfig({
          model: 'gpt-4o',
          temperature: -1,
          max_tokens: 256,
        }).temperature,
      ).toBe(0);
    });

    it('should truncate and ensure positive max_tokens', () => {
      expect(
        normalizeLlmConfig({
          model: 'gpt-4o',
          temperature: 0.5,
          max_tokens: 100.7,
        }).max_tokens,
      ).toBe(100);

      expect(
        normalizeLlmConfig({
          model: 'gpt-4o',
          temperature: 0.5,
          max_tokens: 0,
        }).max_tokens,
      ).toBe(1);

      expect(
        normalizeLlmConfig({
          model: 'gpt-4o',
          temperature: 0.5,
          max_tokens: -50,
        }).max_tokens,
      ).toBe(1);
    });
  });
});
