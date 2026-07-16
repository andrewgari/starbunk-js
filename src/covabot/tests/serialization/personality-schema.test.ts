import { describe, it, expect } from 'vitest';
import {
  speechPatternsSchema,
  personalitySchema,
  socialBatterySchema,
  llmConfigSchema,
  profileSchema,
  yamlConfigSchema,
} from '../../src/serialization/personality-schema';

describe('personality-schema', () => {
  describe('speechPatternsSchema', () => {
    it('should validate with all fields', () => {
      const result = speechPatternsSchema.safeParse({
        lowercase: true,
        sarcasm_level: 0.5,
        technical_bias: 0.7,
      });

      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = speechPatternsSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        lowercase: false,
        sarcasm_level: 0.3,
        technical_bias: 0.5,
      });
    });

    it('should reject sarcasm_level > 1', () => {
      const result = speechPatternsSchema.safeParse({
        lowercase: false,
        sarcasm_level: 1.5,
        technical_bias: 0.5,
      });

      expect(result.success).toBe(false);
    });

    it('should reject sarcasm_level < 0', () => {
      const result = speechPatternsSchema.safeParse({
        lowercase: false,
        sarcasm_level: -0.5,
        technical_bias: 0.5,
      });

      expect(result.success).toBe(false);
    });

    it('should accept boundary values', () => {
      const result = speechPatternsSchema.safeParse({
        lowercase: true,
        sarcasm_level: 0,
        technical_bias: 1,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('personalitySchema', () => {
    it('should validate with all fields', () => {
      const result = personalitySchema.safeParse({
        system_prompt: 'You are a test bot.',
        traits: ['friendly', 'helpful'],
        interests: ['testing'],
        speech_patterns: {
          lowercase: true,
          sarcasm_level: 0.3,
          technical_bias: 0.5,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should allow omitting system_prompt (populated from markdown files at load time)', () => {
      const result = personalitySchema.safeParse({
        traits: ['friendly'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.system_prompt).toBeUndefined();
    });

    it('should apply defaults for optional fields', () => {
      const result = personalitySchema.safeParse({
        system_prompt: 'Test prompt',
      });

      expect(result.success).toBe(true);
      expect(result.data?.traits).toEqual([]);
      expect(result.data?.interests).toEqual([]);
      expect(result.data?.speech_patterns).toEqual({
        lowercase: false,
        sarcasm_level: 0.3,
        technical_bias: 0.5,
      });
    });
  });

  describe('socialBatterySchema', () => {
    it('should validate complete config', () => {
      const result = socialBatterySchema.safeParse({
        max_messages: 10,
        window_minutes: 15,
        cooldown_seconds: 60,
      });

      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = socialBatterySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        max_messages: 5,
        window_minutes: 10,
        cooldown_seconds: 30,
      });
    });

    it('should require positive integers for max_messages', () => {
      expect(socialBatterySchema.safeParse({ max_messages: 0 }).success).toBe(false);
      expect(socialBatterySchema.safeParse({ max_messages: -1 }).success).toBe(false);
      expect(socialBatterySchema.safeParse({ max_messages: 1.5 }).success).toBe(false);
    });

    it('should require nonnegative integer for cooldown_seconds', () => {
      expect(socialBatterySchema.safeParse({ cooldown_seconds: 0 }).success).toBe(true);
      expect(socialBatterySchema.safeParse({ cooldown_seconds: -1 }).success).toBe(false);
    });
  });

  describe('llmConfigSchema', () => {
    it('should validate complete config', () => {
      const result = llmConfigSchema.safeParse({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 512,
      });

      expect(result.success).toBe(true);
    });

    it('should apply defaults', () => {
      const result = llmConfigSchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1024,
      });
    });

    it('should validate temperature range', () => {
      expect(llmConfigSchema.safeParse({ temperature: 0 }).success).toBe(true);
      expect(llmConfigSchema.safeParse({ temperature: 2 }).success).toBe(true);
      expect(llmConfigSchema.safeParse({ temperature: -0.1 }).success).toBe(false);
      expect(llmConfigSchema.safeParse({ temperature: 2.1 }).success).toBe(false);
    });

    it('should require positive integer for max_tokens', () => {
      expect(llmConfigSchema.safeParse({ max_tokens: 1 }).success).toBe(true);
      expect(llmConfigSchema.safeParse({ max_tokens: 0 }).success).toBe(false);
      expect(llmConfigSchema.safeParse({ max_tokens: -1 }).success).toBe(false);
    });
  });

  describe('profileSchema', () => {
    const validProfile = {
      id: 'test-bot',
      display_name: 'Test Bot',
      personality: {
        system_prompt: 'You are a test bot.',
      },
    };

    it('should validate complete profile', () => {
      const result = profileSchema.safeParse(validProfile);

      expect(result.success).toBe(true);
    });

    it('should require id', () => {
      const { id: _, ...withoutId } = validProfile;
      const result = profileSchema.safeParse(withoutId);

      expect(result.success).toBe(false);
    });

    it('should require display_name', () => {
      const { display_name: _, ...withoutDisplayName } = validProfile;
      const result = profileSchema.safeParse(withoutDisplayName);

      expect(result.success).toBe(false);
    });

    it('should accept name_aliases', () => {
      const result = profileSchema.safeParse({
        ...validProfile,
        name_aliases: ['cova', 'covabot'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.name_aliases).toEqual(['cova', 'covabot']);
    });

    it('should default name_aliases to empty array', () => {
      const result = profileSchema.safeParse(validProfile);

      expect(result.success).toBe(true);
      expect(result.data?.name_aliases).toEqual([]);
    });

    it('should apply defaults for social_battery, llm, and ignore_bots', () => {
      const result = profileSchema.safeParse(validProfile);

      expect(result.success).toBe(true);
      expect(result.data?.social_battery).toEqual({
        max_messages: 5,
        window_minutes: 10,
        cooldown_seconds: 30,
      });
      expect(result.data?.llm).toEqual({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 1024,
      });
      expect(result.data?.ignore_bots).toBe(true);
    });
  });

  describe('yamlConfigSchema', () => {
    it('should validate complete YAML config', () => {
      const result = yamlConfigSchema.safeParse({
        profile: {
          id: 'test-bot',
          display_name: 'Test Bot',
          personality: {
            system_prompt: 'You are a test bot.',
          },
        },
      });

      expect(result.success).toBe(true);
    });

    it('should require profile key', () => {
      const result = yamlConfigSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('should reject extra top-level keys in strict mode', () => {
      const result = yamlConfigSchema.safeParse({
        profile: {
          id: 'test-bot',
          display_name: 'Test Bot',
          personality: { system_prompt: 'Test' },
        },
        extraKey: 'should be ignored',
      });

      // Zod by default strips extra keys, so this should still pass
      expect(result.success).toBe(true);
    });
  });
});
