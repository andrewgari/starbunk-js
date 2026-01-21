import { describe, it, expect } from 'vitest';
import { parseYamlBots } from '@/serialization/yaml-bot-parser';

describe('YAML Bot Parser', () => {
  describe('Valid YAML', () => {
    it('should parse a simple bot with static identity', () => {
      const yaml = `
reply-bots:
  - name: test-bot
    identity:
      type: static
      botName: TestBot
      avatarUrl: https://example.com/avatar.png
    responses:
      - Hello!
      - Hi there!
    triggers:
      - name: greeting
        conditions:
          contains_word: hello
    ignore_bots: true
    ignore_humans: false
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots']).toHaveLength(1);
      expect(result['reply-bots'][0].name).toBe('test-bot');
      expect(result['reply-bots'][0].identity.type).toBe('static');
      expect(result['reply-bots'][0].triggers).toHaveLength(1);
      expect(result['reply-bots'][0].ignore_bots).toBe(true);
      expect(result['reply-bots'][0].ignore_humans).toBe(false);
    });

    it('should parse a bot with mimic identity', () => {
      const yaml = `
reply-bots:
  - name: mimic-bot
    identity:
      type: mimic
      as_member: "123456789012345678"
    responses: "Copying you!"
    triggers:
      - conditions:
          always: true
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].identity.type).toBe('mimic');
      expect(result['reply-bots'][0].identity).toHaveProperty('as_member');
    });

    it('should parse a bot with random identity', () => {
      const yaml = `
reply-bots:
  - name: random-bot
    identity:
      type: random
    responses: "Random message!"
    triggers:
      - conditions:
          with_chance: 50
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].identity.type).toBe('random');
    });

    it('should parse multiple bots', () => {
      const yaml = `
reply-bots:
  - name: bot-one
    identity:
      type: static
      botName: BotOne
      avatarUrl: https://example.com/bot1.png
    responses: "Response 1"
    triggers:
      - conditions:
          contains_word: test
  - name: bot-two
    identity:
      type: static
      botName: BotTwo
      avatarUrl: https://example.com/bot2.png
    responses: "Response 2"
    triggers:
      - conditions:
          contains_word: hello
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots']).toHaveLength(2);
      expect(result['reply-bots'][0].name).toBe('bot-one');
      expect(result['reply-bots'][1].name).toBe('bot-two');
    });

    it('should parse complex trigger conditions', () => {
      const yaml = `
reply-bots:
  - name: complex-bot
    identity:
      type: static
      botName: ComplexBot
      avatarUrl: https://example.com/avatar.png
    responses: "Complex response"
    triggers:
      - name: complex-trigger
        conditions:
          all_of:
            - contains_word: banana
            - any_of:
                - from_user: "123456789"
                - with_chance: 50
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers[0].conditions).toHaveProperty('all_of');
    });

    it('should use default values for ignore_bots and ignore_humans', () => {
      const yaml = `
reply-bots:
  - name: default-bot
    identity:
      type: static
      botName: DefaultBot
      avatarUrl: https://example.com/avatar.png
    responses: "Default"
    triggers:
      - conditions:
          always: true
`;

      const result = parseYamlBots(yaml);

      // Default should be ignore_bots: true, ignore_humans: false
      expect(result['reply-bots'][0].ignore_bots).toBe(true);
      expect(result['reply-bots'][0].ignore_humans).toBe(false);
    });

    it('should parse bot with single string response', () => {
      const yaml = `
reply-bots:
  - name: single-response-bot
    identity:
      type: static
      botName: SingleBot
      avatarUrl: https://example.com/avatar.png
    responses: "Just one response"
    triggers:
      - conditions:
          contains_phrase: test
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].responses).toBe('Just one response');
    });

    it('should parse bot with trigger-specific responses', () => {
      const yaml = `
reply-bots:
  - name: trigger-response-bot
    identity:
      type: static
      botName: TriggerBot
      avatarUrl: https://example.com/avatar.png
    triggers:
      - name: trigger-one
        conditions:
          contains_phrase: hello
        responses:
          - "Hello response 1"
          - "Hello response 2"
      - name: trigger-two
        conditions:
          contains_phrase: bye
        responses: "Goodbye!"
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers).toHaveLength(2);
      expect(result['reply-bots'][0].triggers[0].responses).toEqual(['Hello response 1', 'Hello response 2']);
      expect(result['reply-bots'][0].triggers[1].responses).toBe('Goodbye!');
    });

    it('should parse bot with inline condition syntax', () => {
      const yaml = `
reply-bots:
  - name: inline-bot
    identity:
      type: static
      botName: InlineBot
      avatarUrl: https://example.com/avatar.png
    responses: "Inline response"
    triggers:
      - name: inline-trigger
        conditions: { contains_phrase: "test" }
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers[0].conditions).toHaveProperty('contains_phrase');
      expect(result['reply-bots'][0].triggers[0].conditions.contains_phrase).toBe('test');
    });

    it('should parse bot with matches_regex condition', () => {
      const yaml = `
reply-bots:
  - name: regex-bot
    identity:
      type: static
      botName: RegexBot
      avatarUrl: https://example.com/avatar.png
    responses: "Regex matched!"
    triggers:
      - name: regex-trigger
        conditions: { matches_regex: "\\\\b(test|demo)\\\\b" }
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers[0].conditions).toHaveProperty('matches_regex');
    });

    it('should parse bot with from_user condition', () => {
      const yaml = `
reply-bots:
  - name: user-specific-bot
    identity:
      type: static
      botName: UserBot
      avatarUrl: https://example.com/avatar.png
    responses: "User-specific response"
    triggers:
      - name: user-trigger
        conditions:
          from_user: "123456789012345678"
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers[0].conditions).toHaveProperty('from_user');
      expect(result['reply-bots'][0].triggers[0].conditions.from_user).toBe('123456789012345678');
    });

    it('should parse bot with combined all_of and with_chance', () => {
      const yaml = `
reply-bots:
  - name: chance-bot
    identity:
      type: static
      botName: ChanceBot
      avatarUrl: https://example.com/avatar.png
    responses: "Lucky response!"
    triggers:
      - name: chance-trigger
        conditions:
          all_of:
            - always: true
            - with_chance: 10
`;

      const result = parseYamlBots(yaml);

      const conditions = result['reply-bots'][0].triggers[0].conditions;
      expect(conditions).toHaveProperty('all_of');
      expect(conditions.all_of).toHaveLength(2);
      expect(conditions.all_of[0]).toHaveProperty('always');
      expect(conditions.all_of[1]).toHaveProperty('with_chance');
    });

    it('should parse bot with any_of conditions', () => {
      const yaml = `
reply-bots:
  - name: any-bot
    identity:
      type: static
      botName: AnyBot
      avatarUrl: https://example.com/avatar.png
    responses: "Any condition matched!"
    triggers:
      - name: any-trigger
        conditions:
          any_of:
            - contains_phrase: "hello"
            - contains_phrase: "hi"
            - contains_phrase: "hey"
`;

      const result = parseYamlBots(yaml);

      const conditions = result['reply-bots'][0].triggers[0].conditions;
      expect(conditions).toHaveProperty('any_of');
      expect(conditions.any_of).toHaveLength(3);
    });

    it('should parse bot that only responds to bots (ignore_humans: true)', () => {
      const yaml = `
reply-bots:
  - name: bot-only-bot
    identity:
      type: static
      botName: BotOnlyBot
      avatarUrl: https://example.com/avatar.png
    ignore_bots: false
    ignore_humans: true
    responses: "Hello fellow bot!"
    triggers:
      - conditions:
          always: true
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].ignore_bots).toBe(false);
      expect(result['reply-bots'][0].ignore_humans).toBe(true);
    });

    it('should parse bot with multiple triggers', () => {
      const yaml = `
reply-bots:
  - name: multi-trigger-bot
    identity:
      type: static
      botName: MultiBot
      avatarUrl: https://example.com/avatar.png
    responses:
      - "Response 1"
      - "Response 2"
      - "Response 3"
    triggers:
      - name: trigger-one
        conditions: { contains_phrase: "hello" }
      - name: trigger-two
        conditions: { contains_phrase: "goodbye" }
      - name: trigger-three
        conditions: { matches_regex: "\\\\btest\\\\b" }
      - name: trigger-four
        conditions:
          all_of:
            - contains_phrase: "complex"
            - with_chance: 50
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers).toHaveLength(4);
      expect(result['reply-bots'][0].triggers[0].name).toBe('trigger-one');
      expect(result['reply-bots'][0].triggers[1].name).toBe('trigger-two');
      expect(result['reply-bots'][0].triggers[2].name).toBe('trigger-three');
      expect(result['reply-bots'][0].triggers[3].name).toBe('trigger-four');
    });

    it('should parse deeply nested conditions', () => {
      const yaml = `
reply-bots:
  - name: nested-bot
    identity:
      type: static
      botName: NestedBot
      avatarUrl: https://example.com/avatar.png
    responses: "Deeply nested!"
    triggers:
      - name: nested-trigger
        conditions:
          all_of:
            - any_of:
                - contains_phrase: "test"
                - contains_phrase: "demo"
            - all_of:
                - from_user: "123456789"
                - with_chance: 75
`;

      const result = parseYamlBots(yaml);

      const conditions = result['reply-bots'][0].triggers[0].conditions;
      expect(conditions).toHaveProperty('all_of');
      expect(conditions.all_of).toHaveLength(2);
      expect(conditions.all_of[0]).toHaveProperty('any_of');
      expect(conditions.all_of[1]).toHaveProperty('all_of');
    });

    it('should parse trigger without name field', () => {
      const yaml = `
reply-bots:
  - name: unnamed-trigger-bot
    identity:
      type: static
      botName: UnnamedBot
      avatarUrl: https://example.com/avatar.png
    responses: "No name needed"
    triggers:
      - conditions:
          contains_phrase: "test"
`;

      const result = parseYamlBots(yaml);

      expect(result['reply-bots'][0].triggers[0].name).toBeUndefined();
      expect(result['reply-bots'][0].triggers[0].conditions).toHaveProperty('contains_phrase');
    });
  });

  describe('Invalid YAML', () => {
    it('should throw error for invalid YAML syntax', () => {
      const yaml = `
reply-bots:
  - name: broken-bot
    identity:
      type: static
      botName: BrokenBot
      avatarUrl: not a valid url
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const yaml = `
reply-bots:
  - name: incomplete-bot
    responses: "Hello"
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for invalid identity type', () => {
      const yaml = `
reply-bots:
  - name: invalid-identity-bot
    identity:
      type: invalid_type
    responses: "Hello"
    triggers:
      - conditions:
          always: true
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for missing triggers', () => {
      const yaml = `
reply-bots:
  - name: no-triggers-bot
    identity:
      type: static
      botName: NoTriggersBot
      avatarUrl: https://example.com/avatar.png
    responses: "Hello"
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for empty triggers array', () => {
      const yaml = `
reply-bots:
  - name: empty-triggers-bot
    identity:
      type: static
      botName: EmptyTriggersBot
      avatarUrl: https://example.com/avatar.png
    responses: "Hello"
    triggers: []
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for trigger without conditions', () => {
      const yaml = `
reply-bots:
  - name: no-conditions-bot
    identity:
      type: static
      botName: NoConditionsBot
      avatarUrl: https://example.com/avatar.png
    responses: "Hello"
    triggers:
      - name: broken-trigger
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for mimic identity without as_member', () => {
      const yaml = `
reply-bots:
  - name: broken-mimic-bot
    identity:
      type: mimic
    responses: "Hello"
    triggers:
      - conditions:
          always: true
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for static identity without botName', () => {
      const yaml = `
reply-bots:
  - name: broken-static-bot
    identity:
      type: static
      avatarUrl: https://example.com/avatar.png
    responses: "Hello"
    triggers:
      - conditions:
          always: true
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for static identity without avatarUrl', () => {
      const yaml = `
reply-bots:
  - name: broken-static-bot-2
    identity:
      type: static
      botName: BrokenBot
    responses: "Hello"
    triggers:
      - conditions:
          always: true
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for empty reply-bots array', () => {
      const yaml = `
reply-bots: []
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });

    it('should throw error for missing reply-bots key', () => {
      const yaml = `
some-other-key:
  - name: test
`;

      expect(() => parseYamlBots(yaml)).toThrow();
    });
  });
});

