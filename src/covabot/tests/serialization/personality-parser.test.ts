import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parsePersonalityFile,
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
  name_aliases:
    - "test"
    - "testbot"

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

    it('should parse name_aliases', () => {
      const yamlContent = `
profile:
  id: "alias-bot"
  display_name: "Alias Bot"
  name_aliases:
    - "alias"
    - "aliasbot"

  personality:
    system_prompt: "You respond to aliases."
`;
      const filePath = path.join(testDir, 'alias.yml');
      fs.writeFileSync(filePath, yamlContent);

      const profile = parsePersonalityFile(filePath);

      expect(profile.nameAliases).toEqual(['alias', 'aliasbot']);
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
  personality:
    system_prompt: "Test"
  memory:
    channel_window: 20
`;
      const dir = mkPersonalityDir('memory-bot', yaml);
      const profile = loadPersonalityFromDirectory(dir);

      expect(profile.memory.channelWindow).toBe(20);
    });

    it('should parse user relationships from relationships.md even with usernames/labels in headings', () => {
      const yaml = `
profile:
  id: "relationship-bot"
  display_name: "Relationship Bot"
  personality:
    system_prompt: "Test"
`;
      const dir = mkPersonalityDir('relationship-bot', yaml, {
        'relationships.md': `
## 123456789012345678 - andrewgari
You speak like a Knight to their King.

## 876543210987654321 (Alice)
You are extremely friendly to her.
`,
      });
      const profile = loadPersonalityFromDirectory(dir);

      expect(profile.personality.userRelationships).toEqual({
        '123456789012345678': 'You speak like a Knight to their King.',
        '876543210987654321': 'You are extremely friendly to her.',
      });
    });
  });
});
