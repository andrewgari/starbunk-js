import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PersonalityManager } from '../../src/serialization/personality-manager';

const validYaml = (id: string, name: string) => `
profile:
  id: "${id}"
  display_name: "${name}"
  identity:
    type: static
    botName: "${name}"
  personality:
    system_prompt: "Hello"
`;

/** Create a personality subdirectory containing profile.yml */
function mkPersonality(testDir: string, id: string, name: string) {
  const dir = path.join(testDir, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'profile.yml'), validYaml(id, name));
}

/** Remove a personality subdirectory */
function rmPersonality(testDir: string, id: string) {
  fs.rmSync(path.join(testDir, id), { recursive: true, force: true });
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

  it('keeps previous state if directory read fails during refresh (rollback)', () => {
    mkPersonality(testDir, 'a', 'A');
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonalityCount()).toBe(1);

    // Turn the directory into a file to force readdirSync to throw
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.writeFileSync(testDir, 'not-a-directory');

    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(1); // unchanged
    expect(mgr.getActivePersonality()).toBeNull();
  });

  it('restores previous active personality after refresh when still present; clears when removed', () => {
    mkPersonality(testDir, 'x', 'X');
    mkPersonality(testDir, 'y', 'Y');
    const mgr = new PersonalityManager(testDir);
    const x = mgr.getPersonalityById('x')!;
    mgr.activatePersonality(x);
    expect(mgr.getActivePersonality()?.id).toBe('x');

    // Add new personality and refresh (x still exists)
    mkPersonality(testDir, 'z', 'Z');
    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(3);
    expect(mgr.getActivePersonality()?.id).toBe('x');

    // Remove x and refresh -> active becomes null
    rmPersonality(testDir, 'x');
    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(2);
    expect(mgr.getActivePersonality()).toBeNull();
  });

  it('fs.watch triggers debounced refresh and dispose does not throw', async () => {
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonalityCount()).toBe(0);

    // Create a new personality subdir and rely on real fs.watch debounce (~500ms)
    mkPersonality(testDir, 'n', 'N');
    await new Promise(r => setTimeout(r, 700));

    expect(mgr.getPersonalityCount()).toBe(1);

    expect(() => mgr.dispose()).not.toThrow();
  });
});
