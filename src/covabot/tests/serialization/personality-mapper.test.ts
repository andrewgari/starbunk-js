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
      name_aliases: ['cova', 'covabot'],
      social_battery: {
        max_messages: 5,
        window_minutes: 10,
        cooldown_seconds: 30,
      },
      memory: {
        channel_window: 8,
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

    it('should map name_aliases as lowercase trimmed strings', () => {
      const config = createValidConfig({
        name_aliases: ['  Cova  ', 'COVABOT', 'cova'],
      });

      const result = mapToCovaProfile(config);

      expect(result.nameAliases).toEqual(['cova', 'covabot', 'cova']);
    });

    it('should default nameAliases to empty array when not provided', () => {
      const config = createValidConfig({ name_aliases: undefined });

      const result = mapToCovaProfile(config);

      expect(result.nameAliases).toEqual([]);
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

    it('should map memory channel_window', () => {
      const config = createValidConfig({
        memory: { channel_window: 20 },
      });

      const result = mapToCovaProfile(config);

      expect(result.memory.channelWindow).toBe(20);
    });

    it('should default channelWindow to 8 when memory not provided', () => {
      const config = createValidConfig({ memory: undefined });

      const result = mapToCovaProfile(config);

      expect(result.memory.channelWindow).toBe(8);
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
      expect(Object.isFrozen(result.nameAliases)).toBe(true);
    });
  });
});
