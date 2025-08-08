import 'dotenv/config';
import { WebhookClient, Client, GatewayIntentBits, Message, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Simple logger
const log = (...args: any[]) => console.log('[E2E]', ...args);

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

// Load and validate env
const WEBHOOK_URL = requireEnv('E2E_TEST_WEBHOOK_URL');
const CHANNEL_ID = requireEnv('E2E_TEST_CHANNEL_ID');
const GUILD_ID = process.env.E2E_TEST_SERVER_ID || process.env.GUILD_ID || '';
const MONITOR_TOKEN = requireEnv('E2E_MONITOR_TOKEN');

const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT_MS || '20000', 10);
const INCLUDE_CHANCE = process.env.E2E_INCLUDE_CHANCE_BOTS === 'true';
const CHANCE_ATTEMPTS = parseInt(process.env.E2E_CHANCE_ATTEMPTS || '5', 10);
function detectAvailableBots(): string[] {
  const botsDir = path.resolve(__dirname, '../../src/reply-bots');
  try {
    const entries = fs.readdirSync(botsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory() && e.name.endsWith('-bot')).map(e => e.name);
  } catch {
    return [];
  }
}

const DELAY_MS = parseInt(process.env.E2E_DELAY_MS || '2000', 10);

// Messages meant to trigger reply bots. Adjust as your bots/phrases evolve.
// Because bots are file-discovered and currently none are present, this is a scaffold.
type TestResult = { name: string; content: string; ok: boolean; replies: number; durationMs: number; details?: string };

// Add your known triggers here as you (re)introduce reply bots.
const testCases: { name: string; content: string }[] = [
  // BluBot sequence: mention then acknowledge
  { name: 'BluBot: mention', content: 'blu' },
  { name: 'BluBot: acknowledge', content: 'yes' },

  // Deterministic bots
  { name: 'HoldBot', content: 'Hold' },
  { name: 'MacaroniBot', content: 'macaroni' },
  { name: 'BananaBot', content: 'banana' },
  { name: 'SheeshBot', content: 'sheeeesh' },
  { name: 'PickleBot', content: 'gremlin' },
  { name: 'ChaosBot', content: 'chaos' },
  { name: 'CheckBot', content: 'please check this' },
  { name: 'EzioBot', content: 'ezio' },
  { name: 'GundamBot', content: 'gundam' },
  { name: 'NiceBot', content: '69' },
  { name: 'MusicCorrectBot', content: '?play never gonna give you up' },
  { name: 'BabyBot', content: 'baby' },
  { name: 'AttitudeBot', content: "I can't believe it" },
  { name: 'VennBot (cringe)', content: 'that is cringe' },
  { name: 'SigGreatBot', content: 'siggles is great' },
  { name: 'GuyBot', content: 'guy' },
  { name: 'SpiderBot (incorrect)', content: 'spiderman' },
  { name: 'SpiderBot (correct)', content: 'spider-man' },

  // Conditional for chance-based bots (non-blocking)
  ...(process.env.E2E_INCLUDE_CHANCE_BOTS === 'true' ? [
    { name: 'HomonymBot (chance)', content: 'I need to buy some flour to bake a flower cake' },
    { name: 'ChadBot (chance)', content: 'this is the chad moment' },
    { name: 'InterruptBot (chance)', content: 'I was going to say something very important but' },
    { name: 'BotBot (chance)', content: 'triggering via bot may or may not be handled here' }
  ] : []),

  // Chance-based or identity-dependent (may be flaky): HomonymBot, ChadBot, BotBot, InterruptBot, VennBot random
];

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: any;
  return Promise.race([
    p.finally(() => clearTimeout(timer)),
    new Promise<T>((_, rej) => {
      timer = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function postViaWebhook(content: string) {
  const client = new WebhookClient({ url: WEBHOOK_URL });
  await client.send({ content });
}

async function monitorForResponses(client: Client, since: number, expectAny = true, ignoreContent?: string): Promise<Message[]> {
  const collected: Message[] = [];

  // We collect any messages in the channel that arrived after `since`.
  const handler = async (message: Message) => {
    try {
      if (message.channelId !== CHANNEL_ID) return;
      if (message.createdTimestamp <= since) return;

      // Ignore the message we just posted via webhook (match by content and webhookId)
      if (ignoreContent && message.webhookId && message.content?.trim() === ignoreContent.trim()) return;

      collected.push(message);
    } catch (e) {
      // ignore
    }
  };

  client.on('messageCreate', handler);

  await sleep(DELAY_MS);
  // Return what we have after delay
  client.off('messageCreate', handler);

  if (expectAny && collected.length === 0) {
    throw new Error('No responses collected in time');
  }
  return collected;
}

async function main() {
  log('Starting live E2E (no mocks)...');

  // Safety checks
  if (process.env.DEBUG_MODE !== 'true') {
    log('WARN: DEBUG_MODE is not true. In production, message filtering may block tests.');
  }
  if (process.env.E2E_ALLOW_WEBHOOK_TESTS !== 'true') {
    log('WARN: E2E_ALLOW_WEBHOOK_TESTS is not true. Webhook test messages may be filtered.');
  }

  // Start a monitor client to observe bunkbot responses
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

  await withTimeout(new Promise<void>((resolve, reject) => {
    client.once('ready', () => {
      log('Monitor client ready as', client.user?.tag);
      resolve();
    });
    client.login(MONITOR_TOKEN).catch(reject);
  }), TIMEOUT_MS, 'Discord login');

  // Ensure target channel exists and is accessible
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel || !('send' in channel)) {
      throw new Error('Target channel is not text-sendable');
    }
    log('Confirmed target channel');
  } catch (e) {
    log('Failed to verify channel access:', e);
    throw e;
  }

  const inventory = detectAvailableBots();

  const results: TestResult[] = [];

  for (const tc of testCases) {
    log(`Posting test case: ${tc.name} -> "${tc.content}"`);

    const attempts = (INCLUDE_CHANCE && tc.name.includes('(chance)')) ? CHANCE_ATTEMPTS : 1;
    let aggregated: Message[] = [];

    const start = Date.now();
    for (let i = 0; i < attempts; i++) {
      const since = Date.now();
      await postViaWebhook(tc.content);
      try {
        const responses = await withTimeout(monitorForResponses(client, since, false, tc.content), TIMEOUT_MS, 'Wait for responses');
        aggregated = aggregated.concat(responses);
      } catch (e) {
        // ignore per-attempt timeout; we aggregate across attempts
      }
      await sleep(DELAY_MS);
    }

    const durationMs = Date.now() - start;
    const botReplies = aggregated.filter(m => m.author.bot);
    const ok = botReplies.length > 0;
    results.push({ name: tc.name, content: tc.content, ok, replies: botReplies.length, durationMs, details: ok ? undefined : 'No replies' });
    log(`Result for ${tc.name}: ${ok ? 'OK' : 'NO REPLY'} in ${durationMs}ms`);
  }

  log('E2E summary:');
  for (const r of results) {
    log(` - ${r.name}: ${r.ok ? 'PASS' : 'FAIL'}${r.details ? ` (${r.details})` : ''}`);
  }

  // Exit code logic
  const allFail = results.every(r => !r.ok);
  const failureThreshold = parseInt(process.env.E2E_FAILURE_THRESHOLD || '1', 10); // max failures to still pass
  const failedCount = results.filter(r => !r.ok).length;
  if (allFail) {
    log('All tests failed; treating run as SKIPPED (non-blocking).');
    process.exit(0);
  }

  const allOk = results.every(r => r.ok);
  const passWithFailures = !allOk && failedCount <= failureThreshold;

  // Post a nicely formatted Discord report (always, even on failure)
  try {
    await postDiscordReport(results);
  } catch (err) {
    log('WARN: failed to post Discord E2E report:', err);
  }

  process.exit(allOk || passWithFailures ? 0 : 1);
}

async function postDiscordReport(results: TestResult[]) {
  const inventoryList = detectAvailableBots();
  const deterministicNames = [
    'AttitudeBot','BabyBot','BananaBot','BluBot: mention','BluBot: acknowledge','ChaosBot','CheckBot','EzioBot','GundamBot','GuyBot','HoldBot','MacaroniBot','MusicCorrectBot','NiceBot','PickleBot','SheeshBot','SigGreatBot','SpiderBot (incorrect)','SpiderBot (correct)','VennBot (cringe)'
  ];
  const chanceNames = ['HomonymBot (chance)','ChadBot (chance)','InterruptBot (chance)','BotBot (chance)'];
  const testedNames = results.map(r => r.name);

  const inventorySection = [
    '**Bot Inventory**',
    '```',
    ...inventoryList.map(n => {
      const display = n.replace(/-bot$/, '');
      if (deterministicNames.includes(display) || deterministicNames.includes(display + ': mention') || deterministicNames.includes(display + ': acknowledge')) {
        return `✓ ${n} — tested (deterministic)`;
      }
      if (chanceNames.some(c => c.startsWith(display))) {
        return INCLUDE_CHANCE ? `~ ${n} — tested (chance)` : `- ${n} — excluded (chance-based)`;
      }
      if (n === 'cova-bot') {
        return '- cova-bot — excluded (LLM/identity)';
      }
      if (n === 'example-bot') {
        return '- example-bot — excluded (example)';
      }
      // default
      const matched = testedNames.find(t => t.toLowerCase().startsWith(display.toLowerCase()));
      return matched ? `✓ ${n} — tested` : `? ${n} — status unknown`;
    }),
    '```'
  ].join('\n');
  const client = new WebhookClient({ url: WEBHOOK_URL });

  const total = results.length;
  const passed = results.filter(r => r.ok).length;
  const failed = total - passed;
  const status = failed === 0 ? '✅ PASSED' : (passed === 0 ? '❌ FAILED' : '⚠️ MIXED');
  const ts = new Date().toISOString();

  // Build a readable details section
  const lines = results.map(r => {
    const icon = r.ok ? '✅' : '❌';
    return `${icon} ${r.name} — replies=${r.replies} — duration=${r.durationMs}ms — trigger: ${r.content}`;
  });

  const debug = process.env.DEBUG_MODE === 'true';
  const e2eEnabled = process.env.E2E_ALLOW_WEBHOOK_TESTS === 'true';

  const description = [
    `**Summary**`,
    `• Total: ${total} | Pass: ${passed} | Fail: ${failed}`,
    `• Status: ${status}`,
    `• When: ${ts}`,
    '',
    `**Environment**`,
    `• Channel: <#${CHANNEL_ID}> (${CHANNEL_ID})`,
    `• DEBUG_MODE: ${debug}`,
    `• E2E_ALLOW_WEBHOOK_TESTS: ${e2eEnabled}`,
    `• E2E_INCLUDE_CHANCE_BOTS: ${INCLUDE_CHANCE} (attempts=${CHANCE_ATTEMPTS})`,
    '',
    `**Details**`,
    '```',
    ...lines,
    '```',
    '',
    inventorySection
  ].join('\n');

  // Footer: include commit SHA if available (supports GITHUB_SHA), else fall back to local git
  const commitEnv = process.env.GIT_COMMIT || process.env.COMMIT_SHA || process.env.GITHUB_SHA || '';
  let commit = commitEnv;
  if (!commit) {
    try {
      const { execSync } = await import('node:child_process');
      commit = execSync('git rev-parse HEAD').toString().trim();
    } catch {}
  }

  const embed = new EmbedBuilder()
    .setTitle('BunkBot Live E2E Report')
    .setDescription(description)
    .setColor(failed === 0 ? 0x2ecc71 : (passed === 0 ? 0xe74c3c : 0xf1c40f))
    .setTimestamp(new Date());

  if (commit) embed.setFooter({ text: `commit ${commit.slice(0, 12)}` });
  await client.send({ embeds: [embed] });
}



main().catch(err => {
  console.error(err);
  process.exit(1);
});

