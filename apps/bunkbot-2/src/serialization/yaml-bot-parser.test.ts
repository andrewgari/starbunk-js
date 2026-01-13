import { describe, it, expect } from 'vitest';
import { parseYamlBots } from './yaml-bot-parser';

describe('YAML Bot Parser', () => {
  describe('Valid YAML', () => {
    it('should parse a simple bot configuration', () => {
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
  });
});

