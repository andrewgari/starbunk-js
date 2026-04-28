import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parsePersonalityFile,
  loadPersonalitiesFromDirectory,
  loadPersonalityFromDirectory,
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
    // Clean up test directory recursively
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('parsePersonalityFile', () => {
    it('should parse a valid personality YAML file', () => {
      const yamlContent = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  avatar_url: "https://example.com/avatar.png"
  name_aliases:
    - "test"
    - "testbot"

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
      expect(profile.nameAliases).toEqual(['test', 'testbot']);
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
`;
      const filePath = path.join(testDir, 'mimic.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.identity.type).toBe('mimic');
      expect((profile.identity as { as_member: string }).as_member).toBe('123456789012345678');
    });

    it('should parse name_aliases', () => {
      const yamlContent = `
profile:
  id: "alias-bot"
  display_name: "Alias Bot"
  name_aliases:
    - "alias"
    - "aliasbot"

  identity:
    type: static
    botName: "Alias Bot"

  personality:
    system_prompt: "You respond to aliases."
`;
      const filePath = path.join(testDir, 'alias.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.nameAliases).toEqual(['alias', 'aliasbot']);
    });
  });

  describe('loadPersonalitiesFromDirectory', () => {
    const mkPersonalityDir = (name: string, yaml: string) => {
      const dir = path.join(testDir, name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'profile.yml'), yaml);
      return dir;
    };

    it('should load all personality subdirectories', () => {
      const yaml1 = `
profile:
  id: "bot-1"
  display_name: "Bot 1"
  identity:
    type: static
    botName: "Bot 1"
  personality:
    system_prompt: "Bot 1"
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
`;
      mkPersonalityDir('bot-1', yaml1);
      mkPersonalityDir('bot-2', yaml2);

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
    });

    it('should skip subdirectories with invalid profile.yml and continue loading', () => {
      const validYaml = `
profile:
  id: "valid-bot"
  display_name: "Valid Bot"
  identity:
    type: static
    botName: "Valid Bot"
  personality:
    system_prompt: "Valid"
`;
      mkPersonalityDir('valid-bot', validYaml);

      const invalidDir = path.join(testDir, 'invalid-bot');
      fs.mkdirSync(invalidDir, { recursive: true });
      fs.writeFileSync(path.join(invalidDir, 'profile.yml'), 'invalid yaml content [[[');

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(1);
      expect(profiles[0].id).toBe('valid-bot');
    });

    it('should load flat .yml files alongside subdirectory personalities', () => {
      const validYaml = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  identity:
    type: static
    botName: "Test Bot"
  personality:
    system_prompt: "Test"
`;
      const flatYaml = `
profile:
  id: "flat-bot"
  display_name: "Flat Bot"
  identity:
    type: static
    botName: "Flat Bot"
  personality:
    system_prompt: "Flat test"
`;
      mkPersonalityDir('test-bot', validYaml);
      // Non-YAML files should still be ignored; flat YAML files should be loaded
      fs.writeFileSync(path.join(testDir, 'readme.txt'), 'Not a personality dir');
      fs.writeFileSync(path.join(testDir, 'flat-bot.yml'), flatYaml);

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(2);
      const ids = profiles.map(p => p.id).sort();
      expect(ids).toEqual(['flat-bot', 'test-bot']);
    });

    it('should skip subdirectories without a profile.yml', () => {
      const validYaml = `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  identity:
    type: static
    botName: "Test Bot"
  personality:
    system_prompt: "Test"
`;
      mkPersonalityDir('test-bot', validYaml);

      // subdir without profile.yml
      fs.mkdirSync(path.join(testDir, 'no-profile'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'no-profile', 'core.md'), 'Just markdown, no profile');

      const profiles = loadPersonalitiesFromDirectory(testDir);

      expect(profiles).toHaveLength(1);
    });
  });

  describe('loadPersonalityFromDirectory', () => {
    const mkPersonalityDir = (
      name: string,
      yaml: string,
      markdownFiles?: Record<string, string>,
    ) => {
      const dir = path.join(testDir, name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'profile.yml'), yaml);
      if (markdownFiles) {
        for (const [file, content] of Object.entries(markdownFiles)) {
          fs.writeFileSync(path.join(dir, file), content);
        }
      }
      return dir;
    };

    it('should use system_prompt from YAML when no markdown files are present', () => {
      const yaml = `
profile:
  id: "yaml-bot"
  display_name: "YAML Bot"
  identity:
    type: static
    botName: "YAML Bot"
  personality:
    system_prompt: "Defined in YAML."
`;
      const dir = mkPersonalityDir('yaml-bot', yaml);
      const profile = loadPersonalityFromDirectory(dir);

      expect(profile.personality.systemPrompt).toBe('Defined in YAML.');
    });

    it('should assemble system prompt from markdown files when present', () => {
      const yaml = `
profile:
  id: "md-bot"
  display_name: "Markdown Bot"
  identity:
    type: static
    botName: "Markdown Bot"
  personality:
    system_prompt: "See core.md"
`;
      const dir = mkPersonalityDir('md-bot', yaml, {
        'core.md': 'You are a test bot living in Discord.',
        'speech.md': '- speak in lowercase',
      });
      const profile = loadPersonalityFromDirectory(dir);

      expect(profile.personality.systemPrompt).toContain('You are a test bot living in Discord.');
      expect(profile.personality.systemPrompt).toContain('speak in lowercase');
      expect(profile.personality.systemPrompt).toContain('## Speech Style');
    });

    it('should use memory.channel_window from profile.yml', () => {
      const yaml = `
profile:
  id: "memory-bot"
  display_name: "Memory Bot"
  identity:
    type: static
    botName: "Memory Bot"
  personality:
    system_prompt: "Test"
  memory:
    channel_window: 20
`;
      const dir = mkPersonalityDir('memory-bot', yaml);
      const profile = loadPersonalityFromDirectory(dir);

      expect(profile.memory.channelWindow).toBe(20);
    });
  });
});
