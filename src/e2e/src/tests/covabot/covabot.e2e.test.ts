/**
 * CovaBot E2E tests
 *
 * Kept intentionally simple: validates the pipeline fires and produces a
 * non-empty response. We do NOT assert exact LLM output — that changes with
 * model versions and is better covered by unit tests with a mocked LLM.
 *
 * What we DO assert:
 *   - Direct @mention always produces a response
 *   - Known personality triggers produce a response (COVABOT_E2E_RESPONSE_CHANCE_OVERRIDE=1.0)
 *   - Completely unrelated messages do NOT produce a response (social battery / interest gate)
 *
 * Environment:
 *   COVABOT_E2E_RESPONSE_CHANCE_OVERRIDE=1.0  — forces all trigger response_chance to 100%
 *   E2E_ALLOWED_BOT_IDS must include E2E_DISCORD_SENDER_BOT_ID so CovaBot processes our messages
 *   LLM must be reachable from the container (Ollama / Gemini / OpenAI key set)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getE2EClient } from '@/harness/discord-e2e-client';
import { env, rateLimit } from '@/harness/test-env';

const CH = () => env.CHANNEL_COVABOT;
const COVABOT_TIMEOUT = 45_000; // LLM can be slow

async function expectCovaResponds(messageContent: string): Promise<void> {
  const client = getE2EClient();

  const responsePromise = client.waitForWebhookResponse(CH(), {
    // CovaBot responds via webhook impersonation with her profile name
    webhookUsername: 'Cova',
    timeout: COVABOT_TIMEOUT,
  });

  await client.send(CH(), messageContent);
  const r = await responsePromise;

  expect(r.webhookId).toBeTruthy();
  expect(r.content.trim().length).toBeGreaterThan(0);
}

async function expectCovaSilent(messageContent: string): Promise<void> {
  const client = getE2EClient();

  const noReply = client.assertNoResponse(CH(), {
    timeout: 10_000,
    filter: m => m.webhookId !== null && m.author.username === 'Cova',
  });

  await client.send(CH(), messageContent);
  await noReply;
}

// ─── Pipeline Tests ──────────────────────────────────────────────────────────

describe('CovaBot: direct @mention always triggers a response', () => {
  beforeEach(rateLimit);

  it('responds when directly @mentioned', async () => {
    await expectCovaResponds(`<@${env.COVABOT_BOT_ID}> hello there`);
  });
});

describe('CovaBot: personality trigger responses', () => {
  beforeEach(rateLimit);

  it('responds to greeting trigger "hey cova"', async () => {
    await expectCovaResponds('hey cova');
  });

  it('responds to help request trigger', async () => {
    await expectCovaResponds('can you help me with this');
  });

  it('responds to tech discussion trigger', async () => {
    await expectCovaResponds('I am working with typescript today');
  });
});

describe('CovaBot: silence / interest gate', () => {
  beforeEach(rateLimit);

  it('does NOT respond to a completely unrelated message', async () => {
    // "iufahjfsajk" is nonsensical — will score very low on all interest vectors
    // and not match any personality trigger
    await expectCovaSilent('iufahjfsajk zlqpx');
  });
});
