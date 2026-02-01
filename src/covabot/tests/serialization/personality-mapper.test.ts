import { describe, it, expect } from 'vitest';
import { mapToCovaProfile } from '../../src/serialization/personality-mapper';
import type { YamlConfigType } from '../../src/serialization/personality-schema';

describe('personality-mapper', () => {
  const createValidConfig = (
    overrides: Partial<YamlConfigType['profile']> = {},
  ): YamlConfigType => ({
    profile: {
      id: 'test-bot',
      display_name: 'Test Bot',
      avatar_url: 'https://example.com/avatar.png',
      identity: {
        type: 'static',
        botName: 'Test Bot',
        avatarUrl: 'https://example.com/avatar.png',
      },
      personality: {
        system_prompt: 'You are a test bot.',
        traits: ['friendly', 'helpful'],
        interests: ['testing', 'quality'],
        speech_patterns: {
          lowercase: true,
          sarcasm_level: 0.3,
          technical_bias: 0.5,
        },
      },
      triggers: [
        {
          name: 'greeting',
          conditions: {
            contains_word: 'hello',
          },
          use_llm: true,
          response_chance: 0.8,
        },
      ],
      social_battery: {
        max_messages: 5,
        window_minutes: 10,
        cooldown_seconds: 30,
      },
      llm: {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 256,
      },
      ignore_bots: true,
      ...overrides,
    },
  });

  describe('mapToCovaProfile', () => {
    it('should map basic profile fields', () => {
      const config = createValidConfig();
      const result = mapToCovaProfile(config);

      expect(result.id).toBe('test-bot');
      expect(result.displayName).toBe('Test Bot');
      expect(result.avatarUrl).toBe('https://example.com/avatar.png');
      expect(result.ignoreBots).toBe(true);
    });

    it('should map personality with trimmed system prompt', () => {
      const config = createValidConfig({
        personality: {
          system_prompt: '  You are a test bot.  ',
          traits: ['friendly'],
          interests: ['testing'],
          speech_patterns: {
            lowercase: false,
            sarcasm_level: 0.3,
            technical_bias: 0.5,
          },
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.personality.systemPrompt).toBe('You are a test bot.');
    });

    it('should filter empty traits and interests', () => {
      const config = createValidConfig({
        personality: {
          system_prompt: 'Test',
          traits: ['friendly', '', '  ', 'helpful'],
          interests: ['testing', '', 'quality'],
          speech_patterns: {
            lowercase: false,
            sarcasm_level: 0.3,
            technical_bias: 0.5,
          },
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.personality.traits).toEqual(['friendly', 'helpful']);
      expect(result.personality.interests).toEqual(['testing', 'quality']);
    });

    it('should trim traits and interests', () => {
      const config = createValidConfig({
        personality: {
          system_prompt: 'Test',
          traits: ['  friendly  ', 'helpful  '],
          interests: ['  testing', 'quality  '],
          speech_patterns: {
            lowercase: false,
            sarcasm_level: 0.3,
            technical_bias: 0.5,
          },
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.personality.traits).toEqual(['friendly', 'helpful']);
      expect(result.personality.interests).toEqual(['testing', 'quality']);
    });

    it('should map speech patterns with correct property names', () => {
      const config = createValidConfig();
      const result = mapToCovaProfile(config);

      expect(result.personality.speechPatterns).toEqual({
        lowercase: true,
        sarcasmLevel: 0.3,
        technicalBias: 0.5,
      });
    });

    it('should map static identity', () => {
      const config = createValidConfig({
        identity: {
          type: 'static',
          botName: 'Custom Bot',
          avatarUrl: 'https://example.com/custom.png',
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.identity).toEqual({
        type: 'static',
        botName: 'Custom Bot',
        avatarUrl: 'https://example.com/custom.png',
      });
    });

    it('should map mimic identity', () => {
      const config = createValidConfig({
        identity: {
          type: 'mimic',
          as_member: '123456789012345678',
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.identity).toEqual({
        type: 'mimic',
        as_member: '123456789012345678',
      });
    });

    it('should map random identity', () => {
      const config = createValidConfig({
        identity: {
          type: 'random',
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.identity).toEqual({
        type: 'random',
      });
    });

    it('should map triggers with normalized conditions', () => {
      const config = createValidConfig({
        triggers: [
          {
            name: '  greeting  ',
            conditions: {
              contains_word: 'hello',
            },
            use_llm: true,
            response_chance: 0.8,
          },
        ],
      });

      const result = mapToCovaProfile(config);

      expect(result.triggers).toHaveLength(1);
      expect(result.triggers[0].name).toBe('greeting');
      expect(result.triggers[0].conditions).toEqual({ contains_word: 'hello' });
      expect(result.triggers[0].use_llm).toBe(true);
      expect(result.triggers[0].response_chance).toBe(0.8);
    });

    it('should map trigger with array responses', () => {
      const config = createValidConfig({
        triggers: [
          {
            name: 'canned',
            conditions: { always: true },
            use_llm: false,
            responses: ['Hello!', 'Hi!'],
          },
        ],
      });

      const result = mapToCovaProfile(config);

      expect(result.triggers[0].responses).toEqual(['Hello!', 'Hi!']);
    });

    it('should map trigger with string response', () => {
      const config = createValidConfig({
        triggers: [
          {
            name: 'canned',
            conditions: { always: true },
            use_llm: false,
            responses: 'Hello!',
          },
        ],
      });

      const result = mapToCovaProfile(config);

      expect(result.triggers[0].responses).toBe('Hello!');
    });

    it('should map social battery with truncated and clamped values', () => {
      const config = createValidConfig({
        social_battery: {
          max_messages: 5.7,
          window_minutes: 10.9,
          cooldown_seconds: 30.5,
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.socialBattery.maxMessages).toBe(5);
      expect(result.socialBattery.windowMinutes).toBe(10);
      expect(result.socialBattery.cooldownSeconds).toBe(30);
    });

    it('should ensure minimum values for social battery', () => {
      const config = createValidConfig({
        social_battery: {
          max_messages: 0,
          window_minutes: 0,
          cooldown_seconds: -5,
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.socialBattery.maxMessages).toBe(1);
      expect(result.socialBattery.windowMinutes).toBe(1);
      expect(result.socialBattery.cooldownSeconds).toBe(0);
    });

    it('should map LLM config with clamped temperature', () => {
      const config = createValidConfig({
        llm: {
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 512,
        },
      });

      const result = mapToCovaProfile(config);

      expect(result.llmConfig).toEqual({
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 512,
      });
    });

    it('should return a frozen (immutable) object', () => {
      const config = createValidConfig();
      const result = mapToCovaProfile(config);

      expect(Object.isFrozen(result)).toBe(true);
      expect(() => {
        (result as { id: string }).id = 'modified';
      }).toThrow();
    });

    it('should deeply freeze nested objects', () => {
      const config = createValidConfig();
      const result = mapToCovaProfile(config);

      expect(Object.isFrozen(result.personality)).toBe(true);
      expect(Object.isFrozen(result.personality.speechPatterns)).toBe(true);
      expect(Object.isFrozen(result.socialBattery)).toBe(true);
      expect(Object.isFrozen(result.llmConfig)).toBe(true);
      expect(Object.isFrozen(result.triggers[0])).toBe(true);
    });

    it('should map multiple triggers', () => {
      const config = createValidConfig({
        triggers: [
          {
            name: 'greeting',
            conditions: { contains_word: 'hello' },
            use_llm: true,
          },
          {
            name: 'farewell',
            conditions: { contains_word: 'goodbye' },
            use_llm: true,
          },
          {
            name: 'random',
            conditions: { with_chance: 0.1 },
            use_llm: true,
          },
        ],
      });

      const result = mapToCovaProfile(config);

      expect(result.triggers).toHaveLength(3);
      expect(result.triggers.map(t => t.name)).toEqual(['greeting', 'farewell', 'random']);
    });

    it('should handle complex nested trigger conditions', () => {
      const config = createValidConfig({
        triggers: [
          {
            name: 'complex',
            conditions: {
              any_of: [
                { contains_word: 'hello' },
                {
                  all_of: [{ from_user: '123456789012345678' }, { with_chance: 0.5 }],
                },
                {
                  none_of: [{ contains_phrase: 'ignore this' }],
                },
              ],
            },
            use_llm: true,
          },
        ],
      });

      const result = mapToCovaProfile(config);

      expect(result.triggers[0].conditions.any_of).toHaveLength(3);
      expect(result.triggers[0].conditions.any_of![1].all_of).toHaveLength(2);
      expect(result.triggers[0].conditions.any_of![2].none_of).toHaveLength(1);
    });
  });
});
