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
  triggers:
    - name: t
      conditions:
        always: true
`;

describe('PersonalityManager refresh & watch', () => {
  const testDir = path.join(__dirname, '../../data/pm-refresh');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      const st = fs.statSync(testDir);
      if (!st.isDirectory()) {
        // If path exists but is not a directory, remove and recreate a clean dir
        fs.rmSync(testDir, { force: true });
        fs.mkdirSync(testDir, { recursive: true });
      } else {
        // Clean directory contents
        for (const f of fs.readdirSync(testDir)) fs.unlinkSync(path.join(testDir, f));
      }
    } else {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // cleanup
    if (fs.existsSync(testDir)) {
      try {
        const st = fs.statSync(testDir);
        if (st.isDirectory()) {
          for (const f of fs.readdirSync(testDir)) fs.unlinkSync(path.join(testDir, f));
        }
        // Remove path regardless of type
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('keeps previous state if directory read fails during refresh (rollback)', () => {
    // seed with one bot
    fs.writeFileSync(path.join(testDir, 'a.yml'), validYaml('a', 'A'));
    const mgr = new PersonalityManager(testDir);
    expect(mgr.getPersonalityCount()).toBe(1);

    // Turn the directory into a file to force readdirSync to throw
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.writeFileSync(testDir, 'not-a-directory');

    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(1); // unchanged
    // ensure active remains unchanged (null by default)
    expect(mgr.getActivePersonality()).toBeNull();
  });

  it('restores previous active personality after refresh when still present; clears when removed', () => {
    fs.writeFileSync(path.join(testDir, 'x.yml'), validYaml('x', 'X'));
    fs.writeFileSync(path.join(testDir, 'y.yml'), validYaml('y', 'Y'));
    const mgr = new PersonalityManager(testDir);
    const x = mgr.getPersonalityById('x')!;
    mgr.activatePersonality(x);
    expect(mgr.getActivePersonality()?.id).toBe('x');

    // Add new file and refresh (x still exists)
    fs.writeFileSync(path.join(testDir, 'z.yml'), validYaml('z', 'Z'));
    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(3);
    expect(mgr.getActivePersonality()?.id).toBe('x');

    // Remove x and refresh -> active becomes null
    fs.unlinkSync(path.join(testDir, 'x.yml'));
    mgr.refreshPersonalities();
    expect(mgr.getPersonalityCount()).toBe(2);
    expect(mgr.getActivePersonality()).toBeNull();
  });

  it('fs.watch triggers debounced refresh and dispose does not throw', async () => {
    const mgr = new PersonalityManager(testDir);
    // Initially empty
    expect(mgr.getPersonalityCount()).toBe(0);

    // Create a new yaml and rely on real fs.watch debounce (~500ms)
    fs.writeFileSync(path.join(testDir, 'n.yml'), validYaml('n', 'N'));
    await new Promise(r => setTimeout(r, 700));

    expect(mgr.getPersonalityCount()).toBe(1);

    // Ensure dispose does not throw (cannot easily assert underlying close here)
    expect(() => mgr.dispose()).not.toThrow();
  });
});
