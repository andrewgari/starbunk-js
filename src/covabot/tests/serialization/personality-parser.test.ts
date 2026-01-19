import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parsePersonalityFile,
  loadPersonalitiesFromDirectory,
} from '../../src/serialization/personality-parser';

describe('PersonalityParser', () => {
  const testDir = path.join(__dirname, '../../data/test-personalities');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file));
      }
      fs.rmdirSync(testDir);
    }
  });

  describe('parsePersonalityFile', () => {
    it('should parse a valid personality YAML file', () => {
      const yamlContent = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  avatar_url: "https://example.com/avatar.png"

  identity:
    type: static
    botName: "Test Bot"
    avatarUrl: "https://example.com/avatar.png"

  personality:
    system_prompt: "You are a test bot."
    traits:
      - "friendly"
      - "helpful"
    interests:
      - "testing"
      - "quality"
    speech_patterns:
      lowercase: true
      sarcasm_level: 0.3
      technical_bias: 0.5

  triggers:
    - name: "greeting"
      conditions:
        contains_word: "hello"
      use_llm: true

  social_battery:
    max_messages: 5
    window_minutes: 10
    cooldown_seconds: 30

  llm:
    model: "gpt-4o-mini"
    temperature: 0.4
    max_tokens: 256

  ignore_bots: true
`;
      const filePath = path.join(testDir, 'test.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.id).toBe('test-bot');
      expect(profile.displayName).toBe('Test Bot');
      expect(profile.personality.systemPrompt).toBe('You are a test bot.');
      expect(profile.personality.traits).toContain('friendly');
      expect(profile.personality.interests).toContain('testing');
      expect(profile.personality.speechPatterns.lowercase).toBe(true);
      expect(profile.triggers).toHaveLength(1);
      expect(profile.triggers[0].name).toBe('greeting');
      expect(profile.socialBattery.maxMessages).toBe(5);
      expect(profile.llmConfig.model).toBe('gpt-4o-mini');
      expect(profile.ignoreBots).toBe(true);
    });

    it('should throw error for missing file', () => {
      expect(() => parsePersonalityFile('/non/existent/file.yml')).toThrow('not found');
    });

    it('should throw error for invalid YAML', () => {
      const filePath = path.join(testDir, 'invalid.yml');
      fs.writeFileSync(filePath, 'invalid: yaml: content: [[[');

      expect(() => parsePersonalityFile(filePath)).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const yamlContent = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  identity:
    type: static
    botName: "Test Bot"
  personality:
    system_prompt: "Test"
`;
      const filePath = path.join(testDir, 'incomplete.yml');
      fs.writeFileSync(filePath, yamlContent);

      expect(() => parsePersonalityFile(filePath)).toThrow();
    });

    it('should apply defaults for optional fields', () => {
      const yamlContent = `
profile:
  id: "minimal-bot"
  display_name: "Minimal Bot"

  identity:
    type: static
    botName: "Minimal Bot"

  personality:
    system_prompt: "You are minimal."

  triggers:
    - name: "always"
      conditions:
        always: true
      use_llm: true
`;
      const filePath = path.join(testDir, 'minimal.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.personality.traits).toEqual([]);
      expect(profile.personality.interests).toEqual([]);
      expect(profile.personality.speechPatterns.lowercase).toBe(false);
      expect(profile.socialBattery.maxMessages).toBe(5);
      expect(profile.socialBattery.windowMinutes).toBe(10);
      expect(profile.llmConfig.model).toBe('gpt-4o-mini');
      expect(profile.ignoreBots).toBe(true);
    });

    it('should parse mimic identity type', () => {
      const yamlContent = `
profile:
  id: "mimic-bot"
  display_name: "Mimic Bot"

  identity:
    type: mimic
    as_member: "123456789012345678"

  personality:
    system_prompt: "You mimic a user."

  triggers:
    - name: "always"
      conditions:
        always: true
`;
      const filePath = path.join(testDir, 'mimic.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.identity.type).toBe('mimic');
      expect((profile.identity as { as_member: string }).as_member).toBe('123456789012345678');
    });

    it('should parse complex trigger conditions', () => {
      const yamlContent = `
profile:
  id: "complex-bot"
  display_name: "Complex Bot"

  identity:
    type: static
    botName: "Complex Bot"

  personality:
    system_prompt: "You have complex triggers."

  triggers:
    - name: "complex"
      conditions:
        any_of:
          - contains_word: "hello"
          - all_of:
              - from_user: "123456789012345678"
              - with_chance: 0.5
      use_llm: true
      response_chance: 0.8
`;
      const filePath = path.join(testDir, 'complex.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.triggers[0].conditions).toHaveProperty('any_of');
      expect(profile.triggers[0].response_chance).toBe(0.8);
    });
  });

  describe('loadPersonalitiesFromDirectory', () => {
    it('should load all personality files from directory', () => {
      const yaml1 = `
profile:
  id: "bot-1"
  display_name: "Bot 1"
  identity:
    type: static
    botName: "Bot 1"
  personality:
    system_prompt: "Bot 1"
  triggers:
    - name: "test"
      conditions:
        always: true
`;
      const yaml2 = `
profile:
  id: "bot-2"
  display_name: "Bot 2"
  identity:
    type: static
    botName: "Bot 2"
  personality:
    system_prompt: "Bot 2"
  triggers:
    - name: "test"
      conditions:
        always: true
`;
      fs.writeFileSync(path.join(testDir, 'bot1.yml'), yaml1);
      fs.writeFileSync(path.join(testDir, 'bot2.yaml'), yaml2);

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(2);
      expect(profiles.map(p => p.id)).toContain('bot-1');
      expect(profiles.map(p => p.id)).toContain('bot-2');
    });

    it('should create directory if it does not exist', () => {
      const newDir = path.join(testDir, 'new-dir');
      const profiles = loadPersonalitiesFromDirectory(newDir);

      expect(profiles).toHaveLength(0);
      expect(fs.existsSync(newDir)).toBe(true);

      // Clean up
      fs.rmdirSync(newDir);
    });

    it('should skip invalid files and continue loading', () => {
      const validYaml = `
profile:
  id: "valid-bot"
  display_name: "Valid Bot"
  identity:
    type: static
    botName: "Valid Bot"
  personality:
    system_prompt: "Valid"
  triggers:
    - name: "test"
      conditions:
        always: true
`;
      const invalidYaml = 'invalid yaml content [[[';

      fs.writeFileSync(path.join(testDir, 'valid.yml'), validYaml);
      fs.writeFileSync(path.join(testDir, 'invalid.yml'), invalidYaml);

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe('valid-bot');
    });

    it('should ignore non-YAML files', () => {
      const validYaml = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  identity:
    type: static
    botName: "Test Bot"
  personality:
    system_prompt: "Test"
  triggers:
    - name: "test"
      conditions:
        always: true
`;
      fs.writeFileSync(path.join(testDir, 'bot.yml'), validYaml);
      fs.writeFileSync(path.join(testDir, 'readme.txt'), 'Not a YAML file');
      fs.writeFileSync(path.join(testDir, 'config.json'), '{}');

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(1);
    });
  });
});
