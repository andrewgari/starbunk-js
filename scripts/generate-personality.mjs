#!/usr/bin/env node
/**
 * generate-personality.mjs
 *
 * Distills a Discord user's message history into a complete CovaBot personality profile.
 *
 * Usage:
 *   node scripts/generate-personality.mjs \
 *     --guild-id  <DISCORD_SERVER_ID> \
 *     --user-id   <DISCORD_USER_ID> \
 *     --name      <DISPLAY_NAME> \
 *     --output    <DIRECTORY_NAME>  (e.g. "andrew") \
 *     [--extra    "Additional context about this person"]
 *
 * Env vars required:
 *   DISCORD_TOKEN     Bot token with READ_MESSAGE_HISTORY in the target server
 *   ANTHROPIC_API_KEY Claude API key for personality generation
 *
 * Output:
 *   src/covabot/config/personalities/<output>/
 *     profile.yml, core.md, speech.md, likes.md, dislikes.md, opinions.md, beliefs.md
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const get = key => {
    const i = args.indexOf(key);
    return i !== -1 && args[i + 1] ? args[i + 1] : null;
  };

  const guildId = get('--guild-id');
  const userId = get('--user-id');
  const name = get('--name');
  const output = get('--output');
  const extra = get('--extra') || '';

  if (!guildId || !userId || !name || !output) {
    console.error(`
Usage: node scripts/generate-personality.mjs \\
  --guild-id  <SERVER_ID> \\
  --user-id   <USER_ID> \\
  --name      <DISPLAY_NAME> \\
  --output    <DIR_NAME> \\
  [--extra    "Additional context"]
    `);
    process.exit(1);
  }

  return { guildId, userId, name, output, extra };
}

// ---------------------------------------------------------------------------
// Discord REST helpers
// ---------------------------------------------------------------------------

const DISCORD_API = 'https://discord.com/api/v10';

async function discordGet(path, token) {
  const res = await fetch(`${DISCORD_API}${path}`, {
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Respect rate limits
  const remaining = parseInt(res.headers.get('X-RateLimit-Remaining') ?? '1', 10);
  const resetAfter = parseFloat(res.headers.get('X-RateLimit-Reset-After') ?? '0');

  if (res.status === 429) {
    const retryAfter = parseFloat(res.headers.get('Retry-After') ?? '1');
    console.log(`  Rate limited — waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000 + 100);
    return discordGet(path, token);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord API ${res.status} on ${path}: ${body}`);
  }

  if (remaining === 0 && resetAfter > 0) {
    await sleep(resetAfter * 1000 + 50);
  }

  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Text channel types we care about
const TEXT_CHANNEL_TYPES = new Set([
  0,  // GUILD_TEXT
  5,  // GUILD_ANNOUNCEMENT
  11, // PUBLIC_THREAD
  12, // PRIVATE_THREAD
]);

async function fetchChannels(guildId, token) {
  console.log('Fetching channels...');
  const channels = await discordGet(`/guilds/${guildId}/channels`, token);
  const text = channels.filter(c => TEXT_CHANNEL_TYPES.has(c.type));
  console.log(`  Found ${text.length} text channels (of ${channels.length} total)`);
  return text;
}

/**
 * Collect up to maxPerChannel messages from a channel, returning only those
 * authored by userId. Stops early once the channel is exhausted.
 */
async function fetchUserMessagesFromChannel(channelId, userId, token, maxPerChannel = 200) {
  const userMessages = [];
  let before = null;
  let fetched = 0;

  while (fetched < maxPerChannel) {
    const limit = Math.min(100, maxPerChannel - fetched);
    const qs = `?limit=${limit}${before ? `&before=${before}` : ''}`;

    let batch;
    try {
      batch = await discordGet(`/channels/${channelId}/messages${qs}`, token);
    } catch {
      break; // no access to this channel — skip
    }

    if (!batch || batch.length === 0) break;

    for (const msg of batch) {
      if (msg.author?.id === userId && msg.type === 0 && msg.content?.trim()) {
        userMessages.push({
          channel: channelId,
          timestamp: msg.timestamp,
          content: msg.content.trim(),
        });
      }
    }

    fetched += batch.length;
    before = batch[batch.length - 1]?.id;

    if (batch.length < 100) break; // end of channel

    await sleep(300); // polite delay between pages
  }

  return userMessages;
}

/**
 * Reservoir-sample `k` items from an array (uniform random).
 */
function reservoirSample(arr, k) {
  if (arr.length <= k) return arr;
  const result = arr.slice(0, k);
  for (let i = k; i < arr.length; i++) {
    const j = Math.floor(Math.random() * (i + 1));
    if (j < k) result[j] = arr[i];
  }
  return result;
}

// ---------------------------------------------------------------------------
// LLM API calls — tries Anthropic, then Gemini, then OpenAI
// ---------------------------------------------------------------------------

async function callAnthropic(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.content[0]?.text ?? '';
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'models/gemini-2.5-flash',
      max_tokens: 8192,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

async function callOpenAI(apiKey, systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 8192,
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? '';
}

async function callLLM(systemPrompt, userPrompt) {
  const providers = [
    { name: 'Anthropic (Claude)', key: process.env.ANTHROPIC_API_KEY, fn: callAnthropic },
    { name: 'Gemini',             key: process.env.GEMINI_API_KEY,    fn: callGemini },
    { name: 'OpenAI',             key: process.env.OPENAI_API_KEY,    fn: callOpenAI },
  ].filter(p => p.key);

  if (providers.length === 0) {
    throw new Error('No LLM API key found. Set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.');
  }

  for (const { name, key, fn } of providers) {
    console.log(`  Trying ${name}...`);
    try {
      return await fn(key, systemPrompt, userPrompt);
    } catch (err) {
      console.warn(`  ${name} failed: ${err.message}`);
      console.warn('  Falling back to next provider...');
    }
  }

  throw new Error('All LLM providers failed.');
}

// ---------------------------------------------------------------------------
// Personality generation prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert at analyzing a real person's writing to create authentic, specific personality profiles for conversational AI.

You will receive a collection of Discord messages from a specific person and must generate a complete CovaBot personality profile. The goal is to produce a simulacrum — a bot that sounds and responds like the actual person, with their specific opinions, humor, quirks, and voice.

Be specific and grounded. Avoid generic descriptions. Pull direct evidence from the messages.

Respond with a single JSON object (no markdown code fences) with these exact keys:
  profile_yml, core_md, speech_md, likes_md, dislikes_md, opinions_md, beliefs_md

Each value is the raw file content as a string.`;

function buildUserPrompt(name, userId, messages, extra) {
  const formatted = messages
    .map(m => `[${m.timestamp.slice(0, 10)}] ${m.content}`)
    .join('\n');

  return `
Here are ${messages.length} Discord messages from ${name} (user ID: ${userId}).
${extra ? `\nAdditional context provided: ${extra}\n` : ''}
---
${formatted}
---

Generate a complete personality profile for ${name}. Instructions for each file:

**profile_yml** — Valid YAML. Use this exact schema:
\`\`\`
profile:
  id: "<slug>"
  display_name: "<name>"
  name_aliases:
    - "<name_lowercase>"
    - "<other_names_they_go_by>"
  identity:
    type: static
    botName: "<name>"
  personality:
    speech_patterns:
      lowercase: <true if they rarely capitalize>
      sarcasm_level: <0.0-1.0 based on observed frequency>
      technical_bias: <0.0-1.0 based on how technical their language is>
    traits:
      - "<trait>"
    topic_affinities:
      - "<topic>"
    background_facts:
      - "<fact>"
  social_battery:
    max_messages: 5
    window_minutes: 10
    cooldown_seconds: 30
  llm:
    model: "claude-haiku-4-5-20251001"
    temperature: <0.3-0.7 based on how consistent vs. variable their responses seem>
    max_tokens: 256
  memory:
    channel_window: 10
  ignore_bots: true
\`\`\`

**core_md** — Who this person is. Their role in the group, their energy, what drives them, how they show up in conversations. Written in second person ("You are..."). Specific, not generic. 3-5 paragraphs.

**speech_md** — How they actually write. Capitalization habits, punctuation style, typical response length, phrases they use, filler words they avoid, how they express enthusiasm or frustration. Bullet list.

**likes_md** — Things they clearly enjoy, return to, or get energized by in conversation. Specific titles, topics, activities. Not generic ("games") but specific ("JRPGs with political intrigue"). Bullet list.

**dislikes_md** — Things that visibly annoy them, get pushback, or that they complain about. Specific. Bullet list.

**opinions_md** — Specific, grounded opinions on topics observed in the messages. Organized by theme (## heading). Not values, but actual takes: "X is better than Y because Z."

**beliefs_md** — Quirky, specific, or unexpected things they seem to believe or assert. The kind of thing that would surprise a new acquaintance. Should feel earned from the messages. Bullet list with brief explanation of each.
`;
}

// ---------------------------------------------------------------------------
// File writing
// ---------------------------------------------------------------------------

function parseGeneratedJson(raw) {
  // Claude sometimes wraps in ```json ... ``` — strip if present
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(cleaned);
}

function writePersonalityFiles(outputDir, files) {
  mkdirSync(outputDir, { recursive: true });

  const map = {
    profile_yml: 'profile.yml',
    core_md: 'core.md',
    speech_md: 'speech.md',
    likes_md: 'likes.md',
    dislikes_md: 'dislikes.md',
    opinions_md: 'opinions.md',
    beliefs_md: 'beliefs.md',
  };

  for (const [key, filename] of Object.entries(map)) {
    if (!files[key]) {
      console.warn(`  Warning: Claude did not generate ${filename}`);
      continue;
    }
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, files[key].trimEnd() + '\n', 'utf8');
    console.log(`  Wrote ${filename}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { guildId, userId, name, output, extra } = parseArgs();

  const discordToken = process.env.DISCORD_TOKEN;

  if (!discordToken) {
    console.error('Error: DISCORD_TOKEN env var not set');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('Error: No LLM API key set. Need ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.');
    process.exit(1);
  }

  // --- Step 1: Fetch Discord messages ---
  console.log(`\nCollecting messages from ${name} (${userId}) in guild ${guildId}...`);

  const channels = await fetchChannels(guildId, discordToken);
  const allMessages = [];

  for (const channel of channels) {
    process.stdout.write(`  Scanning #${channel.name ?? channel.id}... `);
    const msgs = await fetchUserMessagesFromChannel(channel.id, userId, discordToken, 200);
    process.stdout.write(`${msgs.length} messages from user\n`);
    allMessages.push(...msgs);
    await sleep(250); // polite gap between channels
  }

  console.log(`\nTotal messages collected from user: ${allMessages.length}`);

  if (allMessages.length < 10) {
    console.error(`Error: Only found ${allMessages.length} messages — not enough to build a personality.`);
    console.error('Check that the bot is in the server and has READ_MESSAGE_HISTORY permission.');
    process.exit(1);
  }

  // Sort chronologically for better coverage, then sample
  allMessages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const sampled = reservoirSample(allMessages, 2000);
  // Re-sort sampled messages chronologically
  sampled.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  console.log(`Using ${sampled.length} messages for personality generation.`);

  // --- Step 2: Generate personality via Claude ---
  console.log('\nCalling Claude to generate personality profile...');

  const userPrompt = buildUserPrompt(name, userId, sampled, extra);
  const raw = await callLLM(SYSTEM_PROMPT, userPrompt);

  console.log('Response received. Parsing...');

  let files;
  try {
    files = parseGeneratedJson(raw);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON. Raw output saved to /tmp/personality-raw.txt');
    writeFileSync('/tmp/personality-raw.txt', raw, 'utf8');
    throw err;
  }

  // --- Step 3: Write files ---
  const outputDir = join(ROOT, 'src', 'covabot', 'config', 'personalities', output);
  console.log(`\nWriting personality files to ${outputDir}/`);
  writePersonalityFiles(outputDir, files);

  console.log(`\nDone! Personality "${name}" created in:`);
  console.log(`  src/covabot/config/personalities/${output}/`);
  console.log('\nNext steps:');
  console.log('  1. Review the generated files and tweak as needed');
  console.log('  2. Copy to your Unraid appdata: config/covabot/personalities/');
  console.log('  3. Restart covabot to pick up the new personality');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
