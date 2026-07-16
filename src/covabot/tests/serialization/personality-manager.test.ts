import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalityManager } from '../../src/serialization/personality-manager';

describe('PersonalityManager', () => {
  const testDir = path.join(__dirname, '../../data/test-personality-manager');

  const mkPersonalityDir = (yaml: string) => {
    fs.writeFileSync(path.join(testDir, 'profile.yml'), yaml);
    return testDir;
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
    it('should load personality from specified directory', () => {
      mkPersonalityDir(
        `
profile:
  id: "test-bot"
  display_name: "Test Bot"
  personality:
    system_prompt: "You are a test bot."
    traits: ["friendly"]
    interests: ["testing"]
`,
      );

      const manager = new PersonalityManager(testDir);

      expect(manager.getPersonality()).toBeDefined();
      expect(manager.getPersonality()?.id).toBe('test-bot');
    });

    it('should handle empty directory by throwing or keeping null', () => {
      // In the current implementation, if the file is missing it throws FileNotFoundError.
      // So let's wrap it in an expect.toThrow()
      expect(() => new PersonalityManager(testDir)).toThrow();
    });
  });

  describe('getPersonality', () => {
    it('should return personality', () => {
      mkPersonalityDir(
        `
profile:
  id: "bot-1"
  display_name: "Bot 1"
  personality:
    system_prompt: "Bot 1"
`,
      );

      const manager = new PersonalityManager(testDir);
      const personality = manager.getPersonality();

      expect(personality).toBeDefined();
      expect(personality?.id).toBe('bot-1');
      expect(personality?.displayName).toBe('Bot 1');
    });
  });
});
