/**
 * CovaBot E2E tests
 *
 * Validates the pipeline fires and produces a non-empty response.
 * We do NOT assert exact LLM output — that changes with model versions
 * and is better covered by unit tests with a mocked LLM.
 *
 * What we DO assert:
 *   - Direct @mention always produces a response (bypasses social battery)
 *   - Messages containing Cova's name/alias produce a response
 *     (nameReferenced = true is a strong engagement signal for the LLM)
 *   - Completely unrelated messages with no context signals do NOT produce
 *     a response (LLM outputs <IGNORE_CONVERSATION> for irrelevant content)
 *
 * Note: There are no longer hard-coded trigger patterns. Engagement is decided
 * entirely by the LLM given structured context signals (wasMentioned,
 * nameReferenced, isDirectExchange, etc.).
 *
 * Environment:
 *   E2E_ALLOWED_BOT_IDS must include E2E_DISCORD_SENDER_BOT_ID so CovaBot
 *   processes our messages.
 *   LLM must be reachable from the container (Ollama / Gemini / OpenAI key set).
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

describe('CovaBot: name reference triggers a response', () => {
  beforeEach(rateLimit);

  it('responds when name is referenced in a greeting', async () => {
    await expectCovaResponds('hey cova, how are you doing?');
  });

  it('responds when name is referenced in a question', async () => {
    await expectCovaResponds('cova what do you think about typescript?');
  });
});

describe('CovaBot: silence / no engagement signal', () => {
  beforeEach(rateLimit);

  it('does NOT respond to a message with no context signals', async () => {
    // No @mention, no name reference, no conversation context — LLM should output
    // <IGNORE_CONVERSATION> for completely unrelated content
    await expectCovaSilent('iufahjfsajk zlqpx');
  });
});
