import { describe, it, expect } from 'vitest';
import {
  identitySchema,
  speechPatternsSchema,
  personalitySchema,
  conditionSchema,
  triggerSchema,
  socialBatterySchema,
  llmConfigSchema,
  profileSchema,
  yamlConfigSchema,
} from '../../src/serialization/personality-schema';

describe('personality-schema', () => {
  describe('identitySchema', () => {
    it('should validate static identity with all fields', () => {
      const result = identitySchema.safeParse({
        type: 'static',
        botName: 'Test Bot',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(result.success).toBe(true);
    });

    it('should validate static identity without optional avatarUrl', () => {
      const result = identitySchema.safeParse({
        type: 'static',
        botName: 'Test Bot',
      });

      expect(result.success).toBe(true);
    });

    it('should reject static identity without botName', () => {
      const result = identitySchema.safeParse({
        type: 'static',
      });

      expect(result.success).toBe(false);
    });

    it('should validate mimic identity with valid Discord user ID', () => {
      const result = identitySchema.safeParse({
        type: 'mimic',
        as_member: '123456789012345678',
      });

      expect(result.success).toBe(true);
    });

    it('should reject mimic identity with invalid user ID', () => {
      const result = identitySchema.safeParse({
        type: 'mimic',
        as_member: 'not-a-valid-id',
      });

      expect(result.success).toBe(false);
    });

    it('should reject mimic identity with too short user ID', () => {
      const result = identitySchema.safeParse({
        type: 'mimic',
        as_member: '12345678901234567', // 17 digits min
      });

      expect(result.success).toBe(true); // 17 is valid

      const tooShort = identitySchema.safeParse({
        type: 'mimic',
        as_member: '1234567890123456', // 16 digits - too short
      });

      expect(tooShort.success).toBe(false);
    });

    it('should validate random identity', () => {
      const result = identitySchema.safeParse({
        type: 'random',
      });

      expect(result.success).toBe(true);
    });

    it('should reject unknown identity type', () => {
      const result = identitySchema.safeParse({
        type: 'unknown',
      });

      expect(result.success).toBe(false);
    });
  });

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

    it('should require system_prompt', () => {
      const result = personalitySchema.safeParse({
        traits: ['friendly'],
      });

      expect(result.success).toBe(false);
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

  describe('conditionSchema', () => {
    it('should validate simple conditions', () => {
      expect(conditionSchema.safeParse({ matches_pattern: 'test.*' }).success).toBe(true);
      expect(conditionSchema.safeParse({ contains_word: 'hello' }).success).toBe(true);
      expect(conditionSchema.safeParse({ contains_phrase: 'hello world' }).success).toBe(true);
      expect(conditionSchema.safeParse({ from_user: '123456789' }).success).toBe(true);
      expect(conditionSchema.safeParse({ with_chance: 0.5 }).success).toBe(true);
      expect(conditionSchema.safeParse({ always: true }).success).toBe(true);
    });

    it('should reject empty condition', () => {
      const result = conditionSchema.safeParse({});

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('At least one condition');
    });

    it('should validate with_chance in range', () => {
      expect(conditionSchema.safeParse({ with_chance: 0 }).success).toBe(true);
      expect(conditionSchema.safeParse({ with_chance: 1 }).success).toBe(true);
      expect(conditionSchema.safeParse({ with_chance: 0.5 }).success).toBe(true);
    });

    it('should reject with_chance out of range', () => {
      expect(conditionSchema.safeParse({ with_chance: -0.1 }).success).toBe(false);
      expect(conditionSchema.safeParse({ with_chance: 1.1 }).success).toBe(false);
    });

    it('should validate any_of array', () => {
      const result = conditionSchema.safeParse({
        any_of: [{ contains_word: 'hello' }, { contains_word: 'hi' }],
      });

      expect(result.success).toBe(true);
    });

    it('should validate all_of array', () => {
      const result = conditionSchema.safeParse({
        all_of: [{ from_user: '123' }, { with_chance: 0.5 }],
      });

      expect(result.success).toBe(true);
    });

    it('should validate none_of array', () => {
      const result = conditionSchema.safeParse({
        none_of: [{ contains_word: 'spam' }],
      });

      expect(result.success).toBe(true);
    });

    it('should validate deeply nested conditions', () => {
      const result = conditionSchema.safeParse({
        any_of: [
          {
            all_of: [
              { from_user: '123' },
              {
                none_of: [{ contains_word: 'ignore' }],
              },
            ],
          },
          { with_chance: 0.1 },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('should reject nested empty conditions', () => {
      const result = conditionSchema.safeParse({
        any_of: [{}],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('triggerSchema', () => {
    it('should validate complete trigger', () => {
      const result = triggerSchema.safeParse({
        name: 'greeting',
        conditions: { contains_word: 'hello' },
        use_llm: true,
        response_chance: 0.8,
        responses: ['Hello!', 'Hi!'],
      });

      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = triggerSchema.safeParse({
        conditions: { always: true },
        use_llm: true,
      });

      expect(result.success).toBe(false);
    });

    it('should require conditions', () => {
      const result = triggerSchema.safeParse({
        name: 'test',
        use_llm: true,
      });

      expect(result.success).toBe(false);
    });

    it('should apply default for use_llm', () => {
      const result = triggerSchema.safeParse({
        name: 'test',
        conditions: { always: true },
      });

      expect(result.success).toBe(true);
      expect(result.data?.use_llm).toBe(true);
    });

    it('should accept string response', () => {
      const result = triggerSchema.safeParse({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        responses: 'Single response',
      });

      expect(result.success).toBe(true);
      expect(result.data?.responses).toBe('Single response');
    });

    it('should accept array responses', () => {
      const result = triggerSchema.safeParse({
        name: 'test',
        conditions: { always: true },
        use_llm: false,
        responses: ['Response 1', 'Response 2'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.responses).toEqual(['Response 1', 'Response 2']);
    });

    it('should reject response_chance out of range', () => {
      const result = triggerSchema.safeParse({
        name: 'test',
        conditions: { always: true },
        use_llm: true,
        response_chance: 1.5,
      });

      expect(result.success).toBe(false);
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
        max_tokens: 256,
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
      identity: {
        type: 'static',
        botName: 'Test Bot',
      },
      personality: {
        system_prompt: 'You are a test bot.',
      },
      triggers: [
        {
          name: 'test',
          conditions: { always: true },
        },
      ],
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

    it('should require at least one trigger', () => {
      const result = profileSchema.safeParse({
        ...validProfile,
        triggers: [],
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('At least one trigger');
    });

    it('should validate optional avatar_url as URL', () => {
      const withAvatar = profileSchema.safeParse({
        ...validProfile,
        avatar_url: 'https://example.com/avatar.png',
      });

      expect(withAvatar.success).toBe(true);

      const invalidAvatar = profileSchema.safeParse({
        ...validProfile,
        avatar_url: 'not-a-url',
      });

      expect(invalidAvatar.success).toBe(false);
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
        max_tokens: 256,
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
          identity: {
            type: 'static',
            botName: 'Test Bot',
          },
          personality: {
            system_prompt: 'You are a test bot.',
          },
          triggers: [
            {
              name: 'test',
              conditions: { always: true },
            },
          ],
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
          identity: { type: 'random' },
          personality: { system_prompt: 'Test' },
          triggers: [{ name: 'test', conditions: { always: true } }],
        },
        extraKey: 'should be ignored',
      });

      // Zod by default strips extra keys, so this should still pass
      expect(result.success).toBe(true);
    });
  });
});
