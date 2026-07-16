import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalityManager } from '../../src/serialization/personality-manager';

const validYaml = (name: string) => `
profile:
  id: "test-bot"
  display_name: "${name}"
  personality:
    system_prompt: "Hello"
`;

/** Create or update the profile.yml in the directory */
function writeProfile(testDir: string, name: string) {
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'profile.yml'), validYaml(name));
}

describe('PersonalityManager refresh & watch', () => {
  const testDir = path.join(__dirname, '../../data/pm-refresh');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('keeps previous state if file read fails during refresh (rollback)', () => {
    writeProfile(testDir, 'A');
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonality()?.displayName).toBe('A');

    // Turn the directory into a file to force read failure
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.writeFileSync(testDir, 'not-a-directory');

    mgr.refreshPersonality();
    expect(mgr.getPersonality()?.displayName).toBe('A'); // unchanged
  });

  it('updates personality after refresh', () => {
    writeProfile(testDir, 'X');
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonality()?.displayName).toBe('X');

    // Update personality and refresh
    writeProfile(testDir, 'Z');
    mgr.refreshPersonality();
    expect(mgr.getPersonality()?.displayName).toBe('Z');
  });

  it('fs.watch triggers debounced refresh and dispose does not throw', async () => {
    // start with a profile so it initializes cleanly
    writeProfile(testDir, 'Old');
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonality()?.displayName).toBe('Old');

    // Update the profile to trigger fs.watch
    writeProfile(testDir, 'New');
    await new Promise(r => setTimeout(r, 700));

    expect(mgr.getPersonality()?.displayName).toBe('New');

    expect(() => mgr.dispose()).not.toThrow();
  });
});
