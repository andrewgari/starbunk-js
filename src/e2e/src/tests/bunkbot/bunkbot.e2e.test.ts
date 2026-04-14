/**
 * BunkBot E2E tests
 *
 * Tests the full YAML-driven bot pipeline using the dedicated E2E test config
 * (e2e-test-bots.yml). Covers every feature combination:
 *
 *   Trigger types:    contains_word, contains_phrase, matches_regex, from_user, with_chance
 *   Compound logic:   all_of, any_of, none_of
 *   Response templates: {start}, {random:N-M:c}, {swap_message:a:b}, response pool
 *   Identity types:   static, random, mimic
 *   Negative tests:   wrong trigger, with_chance:0, none_of blocking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getE2EClient } from '@/harness/discord-e2e-client';
import { env, rateLimit } from '@/harness/test-env';

const CH = () => env.CHANNEL_BUNKBOT;

// Helper: send message, await webhook response from the named bot
async function trigger(
  word: string,
  webhookUsername: string,
  contentCheck: RegExp | string[],
  timeoutMs = 10_000,
) {
  const client = getE2EClient();

  const responsePromise = client.waitForWebhookResponse(CH(), {
    webhookUsername,
    ...(Array.isArray(contentCheck)
      ? { contentIncludes: contentCheck }
      : { contentPattern: contentCheck }),
    timeout: timeoutMs,
  });

  await client.send(CH(), word);
  return responsePromise;
}

// ─── Trigger Types ───────────────────────────────────────────────────────────

describe('BunkBot: trigger types', () => {
  beforeEach(rateLimit);

  it('contains_word: exact whole-word match fires', async () => {
    const r = await trigger('hello e2e_word there', 'E2EWordBot', ['word trigger fired']);
    expect(r.content).toBe('word trigger fired');
  });

  it('contains_word: partial match does NOT fire', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2EWordBot',
    });
    await client.send(CH(), 'e2e_wordpart'); // "e2e_wordpart" ≠ whole word "e2e_word"
    await noReply;
  });

  it('contains_phrase: substring (with spaces) fires', async () => {
    const r = await trigger('well e2e phrase test indeed', 'E2EPhraseBot', [
      'phrase trigger fired',
    ]);
    expect(r.content).toBe('phrase trigger fired');
  });

  it('matches_regex: regex with digit fires', async () => {
    const r = await trigger('e2e_regex42 in message', 'E2ERegexBot', ['regex trigger fired']);
    expect(r.content).toBe('regex trigger fired');
  });

  it('matches_regex: no-match does NOT fire', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2ERegexBot',
    });
    await client.send(CH(), 'e2e_regexNODIGIT');
    await noReply;
  });

  it('from_user: fires when sender is the CI bot', async () => {
    const r = await trigger('e2e_fromuser', 'E2EFromUserBot', ['from_user trigger fired']);
    expect(r.content).toBe('from_user trigger fired');
  });

  it('with_chance:100 always fires', async () => {
    const r = await trigger('e2e_chance100', 'E2EChance100Bot', ['chance 100 fired']);
    expect(r.content).toBe('chance 100 fired');
  });

  it('with_chance:0 never fires', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2EChance0Bot',
    });
    await client.send(CH(), 'e2e_chance0');
    await noReply;
  });
});

// ─── Compound Triggers ───────────────────────────────────────────────────────

describe('BunkBot: compound triggers', () => {
  beforeEach(rateLimit);

  it('all_of: both words present → fires', async () => {
    const r = await trigger('e2e_both1 and e2e_both2', 'E2EAllOfBot', ['all_of fired']);
    expect(r.content).toBe('all_of fired');
  });

  it('all_of: only first word → does NOT fire', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2EAllOfBot',
    });
    await client.send(CH(), 'e2e_both1 only');
    await noReply;
  });

  it('all_of: only second word → does NOT fire', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2EAllOfBot',
    });
    await client.send(CH(), 'e2e_both2 only');
    await noReply;
  });

  it('any_of: first word alone → fires', async () => {
    const r = await trigger('e2e_either1 alone', 'E2EAnyOfBot', ['any_of fired']);
    expect(r.content).toBe('any_of fired');
  });

  it('any_of: second word alone → fires', async () => {
    const r = await trigger('just e2e_either2', 'E2EAnyOfBot', ['any_of fired']);
    expect(r.content).toBe('any_of fired');
  });

  it('none_of: base word without block → fires', async () => {
    const r = await trigger('e2e_nonebase without the block', 'E2ENoneOfBot', ['none_of fired']);
    expect(r.content).toBe('none_of fired');
  });

  it('none_of: base word WITH block → does NOT fire', async () => {
    const client = getE2EClient();
    const noReply = client.assertNoResponse(CH(), {
      filter: m => m.author.username === 'E2ENoneOfBot',
    });
    await client.send(CH(), 'e2e_nonebase e2e_noneblock');
    await noReply;
  });
});

// ─── Response Templates ──────────────────────────────────────────────────────

describe('BunkBot: response templates', () => {
  beforeEach(rateLimit);

  it('{start}: response contains first words of message, italicized', async () => {
    const r = await trigger('e2e_starttemplate hello world extra words', 'E2EStartBot', [
      /You said:/,
    ]);
    // {start} = first 3 words / 15 chars of triggering message, italicized
    expect(r.content).toMatch(/You said:/);
    expect(r.content).toContain('*');
  });

  it('{random:3-5:e}: produces she{3-5}sh pattern', async () => {
    const r = await trigger('e2e_randomtemplate', 'E2ERandomTemplateBot', [/she{3,5}sh/]);
    expect(r.content).toMatch(/^she{3,5}sh$/);
  });

  it('{swap_message:hello:goodbye}: swaps words in original message', async () => {
    const r = await trigger('e2e_swap say hello to me', 'E2ESwapBot', [/goodbye/]);
    expect(r.content).toContain('goodbye');
    expect(r.content).not.toContain('hello');
  });

  it('response pool: response is one of the defined options', async () => {
    const pool = ['pool response alpha', 'pool response beta', 'pool response gamma'];
    const r = await trigger('e2e_pool', 'E2EPoolBot', pool);
    expect(pool).toContain(r.content);
  });
});

// ─── Identity Types ──────────────────────────────────────────────────────────

describe('BunkBot: identity types', () => {
  beforeEach(rateLimit);

  it('static identity: webhook username matches botName', async () => {
    const r = await trigger('e2e_word', 'E2EWordBot', ['word trigger fired']);
    expect(r.author.username).toBe('E2EWordBot');
    expect(r.webhookId).toBeTruthy();
  });

  it('random identity: webhook username is a non-empty guild member name', async () => {
    const client = getE2EClient();

    const responsePromise = client.waitForWebhookResponse(CH(), {
      // We don't know the exact name, just that it's a webhook
      contentIncludes: ['random identity response'],
      timeout: 10_000,
    });

    await client.send(CH(), 'e2e_randomidentity');
    const r = await responsePromise;

    expect(r.webhookId).toBeTruthy();
    expect(r.author.username.trim().length).toBeGreaterThan(0);
  });

  it('mimic identity: webhook username matches the mimicked member (CI sender)', async () => {
    const client = getE2EClient();
    // The mimic bot is configured with as_member = CI sender bot ID
    // So the webhook should impersonate the CI sender's username

    const responsePromise = client.waitForWebhookResponse(CH(), {
      contentIncludes: ['mimic identity response'],
      timeout: 10_000,
    });

    await client.send(CH(), 'e2e_mimic');
    const r = await responsePromise;

    expect(r.webhookId).toBeTruthy();
    // The username should match the CI sender bot's Discord username
    expect(r.author.username).toBe(client.sender.user!.username);
  });
});
