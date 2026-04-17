import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalityManager } from '../../src/serialization/personality-manager';

describe('PersonalityManager', () => {
  const testDir = path.join(__dirname, '../../data/test-personality-manager');

  const mkPersonalityDir = (name: string, yaml: string) => {
    const dir = path.join(testDir, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'profile.yml'), yaml);
    return dir;
  };

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  describe('constructor', () => {
    it('should load personalities from specified directory', () => {
      mkPersonalityDir(
        'test-bot',
        `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  identity:
    type: static
    botName: "Test Bot"
  personality:
    system_prompt: "You are a test bot."
    traits: ["friendly"]
    interests: ["testing"]
`,
      );

      const manager = new PersonalityManager(testDir);

      expect(manager.getPersonalityCount()).toBe(1);
      expect(manager.getPersonalityById('test-bot')).toBeDefined();
    });

    it('should handle empty directory', () => {
      const manager = new PersonalityManager(testDir);

      expect(manager.getPersonalityCount()).toBe(0);
      expect(manager.getAllPersonalities()).toEqual([]);
    });

    it('should use default path when no path provided', () => {
      expect(() => new PersonalityManager()).not.toThrow();
    });
  });

  describe('getPersonalityById', () => {
    it('should return personality by id', () => {
      mkPersonalityDir(
        'bot-1',
        `
profile:
  id: "bot-1"
  display_name: "Bot 1"
  identity:
    type: static
    botName: "Bot 1"
  personality:
    system_prompt: "Bot 1"
`,
      );

      const manager = new PersonalityManager(testDir);
      const personality = manager.getPersonalityById('bot-1');

      expect(personality).toBeDefined();
      expect(personality?.id).toBe('bot-1');
      expect(personality?.displayName).toBe('Bot 1');
    });

    it('should return undefined for non-existent id', () => {
      const manager = new PersonalityManager(testDir);
      const personality = manager.getPersonalityById('non-existent');

      expect(personality).toBeUndefined();
    });
  });

  describe('getPersonalityByName', () => {
    it('should return personality by display name', () => {
      mkPersonalityDir(
        'bot-1',
        `
profile:
  id: "bot-1"
  display_name: "Bot One"
  identity:
    type: static
    botName: "Bot One"
  personality:
    system_prompt: "Bot 1"
`,
      );

      const manager = new PersonalityManager(testDir);
      const personality = manager.getPersonalityByName('Bot One');

      expect(personality).toBeDefined();
      expect(personality?.id).toBe('bot-1');
      expect(personality?.displayName).toBe('Bot One');
    });

    it('should return undefined for non-existent name', () => {
      const manager = new PersonalityManager(testDir);
      const personality = manager.getPersonalityByName('Non-existent Bot');

      expect(personality).toBeUndefined();
    });
  });

  describe('getAllPersonalities', () => {
    it('should return all loaded personalities', () => {
      mkPersonalityDir(
        'bot-1',
        `
profile:
  id: "bot-1"
  display_name: "Bot 1"
  identity:
    type: static
    botName: "Bot 1"
  personality:
    system_prompt: "Bot 1"
`,
      );
      mkPersonalityDir(
        'bot-2',
        `
profile:
  id: "bot-2"
  display_name: "Bot 2"
  identity:
    type: static
    botName: "Bot 2"
  personality:
    system_prompt: "Bot 2"
`,
      );

      const manager = new PersonalityManager(testDir);
      const personalities = manager.getAllPersonalities();

      expect(personalities).toHaveLength(2);
      expect(personalities.map(p => p.id)).toContain('bot-1');
      expect(personalities.map(p => p.id)).toContain('bot-2');
    });
  });
});
