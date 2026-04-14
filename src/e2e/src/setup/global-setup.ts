/**
 * Vitest global setup — runs once before all E2E tests.
 *
 * 1. Validates all required env vars
 * 2. Connects the Discord E2E client
 * 3. Verifies all 4 bots are online in the test guild
 *
 * Note: The BunkBot test YAML (e2e-test-bots.yml) must already be
 * processed and mounted into the BunkBot container before this runs.
 * In CI this is done by the GitHub Actions workflow via envsubst.
 */

import 'dotenv/config';
import { initE2EClient } from '@/harness/discord-e2e-client';
import { env } from '@/harness/test-env';

const BOT_READY_TIMEOUT_MS = 60_000;

export async function setup(): Promise<void> {
  console.log('\n[E2E Global Setup] Connecting to Discord...');

  const client = initE2EClient(env.SENDER_TOKEN, env.ENEMY_TOKEN, env.SENDER_BOT_ID);
  await client.connect();

  console.log('[E2E Global Setup] Connected. Verifying bots are online...');

  const botIds: Record<string, string> = {
    BunkBot: env.BUNKBOT_BOT_ID,
    BlueBot: env.BLUEBOT_BOT_ID,
    CovaBot: env.COVABOT_BOT_ID,
    DJCova: env.DJCOVA_BOT_ID,
  };

  for (const [name, id] of Object.entries(botIds)) {
    const deadline = Date.now() + BOT_READY_TIMEOUT_MS;
    let online = false;
    while (Date.now() < deadline) {
      online = await client.isBotInGuild(env.GUILD_ID, id);
      if (online) break;
      await new Promise(r => setTimeout(r, 2_000));
    }
    if (!online) {
      throw new Error(
        `[E2E Global Setup] ${name} (${id}) did not appear online within ${BOT_READY_TIMEOUT_MS}ms`,
      );
    }
    console.log(`[E2E Global Setup] ✓ ${name} is online`);
  }

  console.log('[E2E Global Setup] All bots online. Tests starting.\n');
}

export async function teardown(): Promise<void> {
  const { getE2EClient } = await import('@/harness/discord-e2e-client');
  try {
    const client = getE2EClient();
    await client.disconnect();
    console.log('[E2E Global Teardown] Disconnected.\n');
  } catch {
    // client may not have been initialized if setup failed
  }
}
