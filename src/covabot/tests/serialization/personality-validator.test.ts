import { describe, it, expect } from 'vitest';
import { validateOrThrow } from '../../src/serialization/personality-validator';

describe('personality-validator', () => {
  const validProfile = {
    profile: {
      id: 'test-bot',
      display_name: 'Test Bot',
      identity: {
        type: 'static',
        botName: 'Test Bot',
      },
      personality: {
        system_prompt: 'You are a test bot.',
        traits: ['friendly'],
        interests: ['testing'],
        speech_patterns: {
          lowercase: false,
          sarcasm_level: 0.3,
          technical_bias: 0.5,
        },
      },
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
    },
  };

  describe('validateOrThrow', () => {
    it('should return validated data for valid input', () => {
      const result = validateOrThrow(validProfile);

      expect(result.profile.id).toBe('test-bot');
      expect(result.profile.display_name).toBe('Test Bot');
    });

    it('should throw for missing profile key', () => {
      expect(() => validateOrThrow({})).toThrow();
    });

    it('should throw for missing id', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          id: undefined,
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for missing display_name', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          display_name: undefined,
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for missing identity', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          identity: undefined,
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for invalid identity type', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          identity: {
            type: 'unknown',
          },
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should accept missing system_prompt (populated from markdown files at load time)', () => {
      const withoutPrompt = {
        profile: {
          ...validProfile.profile,
          personality: {
            ...validProfile.profile.personality,
            system_prompt: undefined,
          },
        },
      };
      expect(() => validateOrThrow(withoutPrompt)).not.toThrow();
    });

    it('should throw for invalid mimic identity (bad user ID format)', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          identity: {
            type: 'mimic',
            as_member: 'not-a-valid-id',
          },
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for invalid avatar_url (not a URL)', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          avatar_url: 'not-a-valid-url',
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for sarcasm_level out of range', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          personality: {
            ...validProfile.profile.personality,
            speech_patterns: {
              lowercase: false,
              sarcasm_level: 1.5,
              technical_bias: 0.5,
            },
          },
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for negative max_messages', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          social_battery: {
            max_messages: -1,
            window_minutes: 10,
            cooldown_seconds: 30,
          },
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should throw for temperature out of range', () => {
      const invalid = {
        profile: {
          ...validProfile.profile,
          llm: {
            model: 'gpt-4o',
            temperature: 3,
            max_tokens: 256,
          },
        },
      };
      expect(() => validateOrThrow(invalid)).toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const minimal = {
        profile: {
          id: 'minimal',
          display_name: 'Minimal',
          identity: {
            type: 'random',
          },
          personality: {
            system_prompt: 'Minimal prompt',
          },
        },
      };

      const result = validateOrThrow(minimal);

      expect(result.profile.personality.traits).toEqual([]);
      expect(result.profile.personality.interests).toEqual([]);
      expect(result.profile.personality.speech_patterns.lowercase).toBe(false);
      expect(result.profile.personality.speech_patterns.sarcasm_level).toBe(0.3);
      expect(result.profile.social_battery.max_messages).toBe(5);
      expect(result.profile.llm.model).toBe('gpt-4o-mini');
      expect(result.profile.ignore_bots).toBe(true);
    });

    it('should validate mimic identity with valid Discord user ID', () => {
      const mimicProfile = {
        profile: {
          ...validProfile.profile,
          identity: {
            type: 'mimic',
            as_member: '123456789012345678',
          },
        },
      };

      const result = validateOrThrow(mimicProfile);
      expect(result.profile.identity.type).toBe('mimic');
    });

    it('should validate random identity', () => {
      const randomProfile = {
        profile: {
          ...validProfile.profile,
          identity: {
            type: 'random',
          },
        },
      };

      const result = validateOrThrow(randomProfile);
      expect(result.profile.identity.type).toBe('random');
    });

    it('should format error messages with paths', () => {
      const invalid = {
        profile: {
          id: 'test',
          display_name: 'Test',
          identity: { type: 'static' }, // missing botName
          personality: {
            system_prompt: 'Test',
          },
        },
      };

      expect(() => validateOrThrow(invalid)).toThrow('botName');
    });

    it('should throw for non-object input', () => {
      expect(() => validateOrThrow(null)).toThrow();
      expect(() => validateOrThrow(undefined)).toThrow();
      expect(() => validateOrThrow('string')).toThrow();
      expect(() => validateOrThrow(123)).toThrow();
      expect(() => validateOrThrow([])).toThrow();
    });
  });
});
