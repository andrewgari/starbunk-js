/**
 * BlueBot E2E tests
 *
 * Validates:
 *   - Detection: all "blue" spelling variants trigger a response
 *   - Non-detection: unrelated words and partial matches don't trigger
 *   - Confirm strategy: second message within the reply window triggers confirm
 *   - Timing: reply window expires after BLUEBOT_REPLY_WINDOW_MS
 *   - Enemy / murder: the enemy bot account triggers the Navy Seal copypasta
 *   - Nice requests: "bluebot say something nice about X"
 *
 * Environment:
 *   BLUEBOT_ENEMY_USER_ID must be set to E2E_DISCORD_ENEMY_BOT_ID in the
 *   BlueBot container's env. The enemy bot is the second test account.
 *   BLUEBOT_REPLY_WINDOW_MS should be set to a short value (e.g. 4000) for CI.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getE2EClient } from '@/harness/discord-e2e-client';
import { env, rateLimit } from '@/harness/test-env';

const CH = () => env.CHANNEL_BLUEBOT;
const BLUEBOT_ID = () => env.BLUEBOT_BOT_ID;
const BLUEBOT_DEFAULT = 'Did somebody say Blu?';
const BLUEBOT_CONFIRM = 'Somebody definitely said Blu!';

async function expectBlue(content: string) {
  const client = getE2EClient();
  const responsePromise = client.waitForBotMessage(CH(), {
    botId: BLUEBOT_ID(),
    contentIncludes: [BLUEBOT_DEFAULT],
    timeout: 10_000,
  });
  await client.send(CH(), content);
  const r = await responsePromise;
  expect(r.content).toBe(BLUEBOT_DEFAULT);
  return r;
}

async function expectNoBlue(content: string) {
  const client = getE2EClient();
  const noReply = client.assertNoResponse(CH(), {
    timeout: 4_000,
    filter: m => m.author.id === BLUEBOT_ID(),
  });
  await client.send(CH(), content);
  await noReply;
}

// ─── Detection ───────────────────────────────────────────────────────────────

describe('BlueBot: detection — should always respond', () => {
  beforeEach(rateLimit);

  it('responds to "blue"', () => expectBlue('blue'));
  it('responds to "Blue" (case insensitive)', () => expectBlue('Blue'));
  it('responds to "BLUE"', () => expectBlue('BLUE'));
  it('responds to "bluebot"', () => expectBlue('bluebot'));
  it('responds to "blew" (homophone)', () => expectBlue('I totally blew it'));
  it('responds to "azul" (Spanish)', () => expectBlue('azul'));
  it('responds to "blau" (German)', () => expectBlue('blau'));
  it('responds to "bluuuu" (elongated)', () => expectBlue('bluuuu'));
});

// ─── Non-detection ───────────────────────────────────────────────────────────

describe('BlueBot: non-detection — should never respond', () => {
  beforeEach(rateLimit);

  it('ignores "red"', () => expectNoBlue('red'));
  it('ignores "green and yellow"', () => expectNoBlue('green and yellow'));
  it('ignores "blueberry" (\\b word boundary)', () => expectNoBlue('blueberry pie'));
  it('ignores "blueprint" (\\b word boundary)', () => expectNoBlue('blueprint'));
  it('ignores empty-ish message', () => expectNoBlue('nothing interesting here'));
});

// ─── Confirm Strategy ────────────────────────────────────────────────────────

describe('BlueBot: confirm strategy (reply window)', () => {
  it('confirm fires when second message sent within reply window', async () => {
    const client = getE2EClient();

    // Open the reply window
    const defaultPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_DEFAULT],
      timeout: 10_000,
    });
    await client.send(CH(), 'blue');
    await defaultPromise;

    await rateLimit(500);

    // Send confirm-eligible message within the window
    const confirmPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_CONFIRM],
      timeout: 10_000,
    });
    await client.send(CH(), 'yes');
    const confirm = await confirmPromise;

    expect(confirm.content).toBe(BLUEBOT_CONFIRM);
  });

  it('confirm does NOT fire after reply window expires', async () => {
    const client = getE2EClient();

    // BLUEBOT_REPLY_WINDOW_MS should be set to ~4000ms in CI for this test
    const windowMs = parseInt(process.env.BLUEBOT_REPLY_WINDOW_MS ?? '300000');

    // Open the reply window
    const defaultPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_DEFAULT],
      timeout: 10_000,
    });
    await client.send(CH(), 'blue');
    await defaultPromise;

    // Wait for the window to expire
    await new Promise(r => setTimeout(r, windowMs + 500));

    // Confirm message should produce no response
    const noReply = client.assertNoResponse(CH(), {
      timeout: 4_000,
      filter: m => m.author.id === BLUEBOT_ID() && m.content === BLUEBOT_CONFIRM,
    });
    await client.send(CH(), 'yes');
    await noReply;
  });
});

// ─── Nice Request ─────────────────────────────────────────────────────────────

describe('BlueBot: nice requests', () => {
  beforeEach(rateLimit);

  it('responds with a nice message for a name', async () => {
    const client = getE2EClient();
    const responsePromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentPattern: /pretty blue/i,
      timeout: 10_000,
    });
    await client.send(CH(), 'bluebot say something nice about Alice');
    const r = await responsePromise;
    expect(r.content).toMatch(/pretty blue/i);
  });

  it('refuses to say something nice about the enemy', async () => {
    const client = getE2EClient();
    const responsePromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentPattern: /blue cane/i,
      timeout: 10_000,
    });
    await client.send(CH(), `bluebot say something nice about <@${env.ENEMY_BOT_ID}>`);
    const r = await responsePromise;
    expect(r.content).toMatch(/blue cane/i);
  });
});

// ─── Enemy / Murder (Navy Seal copypasta) ────────────────────────────────────

describe('BlueBot: enemy user and murder window', () => {
  it('enemy saying "blue" gets the default response (opens reply window)', async () => {
    const client = getE2EClient();
    const responsePromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_DEFAULT],
      timeout: 10_000,
    });
    await client.sendAsEnemy(CH(), 'blue');
    const r = await responsePromise;
    expect(r.content).toBe(BLUEBOT_DEFAULT);
  });

  it('enemy saying hostile words within reply window triggers Navy Seal response', async () => {
    const client = getE2EClient();

    // Open the reply window as the enemy
    const defaultPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_DEFAULT],
      timeout: 10_000,
    });
    await client.sendAsEnemy(CH(), 'blue');
    await defaultPromise;

    await rateLimit(500);

    // Enemy sends hostile message — should get the copypasta
    const murderPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentPattern: /what the fuck/i,
      timeout: 10_000,
    });
    await client.sendAsEnemy(CH(), 'I fucking hate bots');
    const murder = await murderPromise;

    expect(murder.content).toMatch(/what the fuck/i);
  });

  it('murder does NOT trigger a second time within the murder window', async () => {
    const client = getE2EClient();

    // BLUEBOT_MURDER_WINDOW_MS should be very long in this test (the previous murder
    // just happened in the test above). So we just verify no second murder fires.
    const defaultPromise = client.waitForBotMessage(CH(), {
      botId: BLUEBOT_ID(),
      contentIncludes: [BLUEBOT_DEFAULT],
      timeout: 10_000,
    });
    await client.sendAsEnemy(CH(), 'blue');
    await defaultPromise;

    await rateLimit(500);

    // Second hostile message — reply window may be open but murder window is not expired
    const noMurder = client.assertNoResponse(CH(), {
      timeout: 4_000,
      filter: m => m.author.id === BLUEBOT_ID() && /what the fuck/i.test(m.content),
    });
    await client.sendAsEnemy(CH(), 'I fucking hate bots again');
    await noMurder;
  });
});
