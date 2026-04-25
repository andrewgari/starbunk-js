#!/usr/bin/env node
/**
 * analyze-prod-logs.mjs
 *
 * Reads per-container log files (starbunk-*.log in CWD), sends them to Claude,
 * and writes a structured analysis to prod-log-analysis.md.
 *
 * Expected input files (written by prod-log-analysis.yml via SSH):
 *   starbunk-bunkbot.log
 *   starbunk-bluebot.log
 *   starbunk-covabot.log
 *   starbunk-djcova.log
 *
 * Requires: ANTHROPIC_API_KEY env var, Node 22
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const CONTAINERS = ['starbunk-bunkbot', 'starbunk-bluebot', 'starbunk-covabot', 'starbunk-djcova'];

function readLog(name, maxLines = 300) {
  const path = `${name}.log`;
  if (!existsSync(path)) return `(${name}.log not found)`;
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  // Take tail — most recent lines are most relevant
  const tail = lines.slice(-maxLines);
  return tail.join('\n') || '(empty)';
}

const date = new Date().toISOString().slice(0, 10);

// Build the log sections
const logSections = CONTAINERS.map(c => {
  const logs = readLog(c);
  return `## ${c} (last 300 lines)\n\`\`\`\n${logs}\n\`\`\``;
}).join('\n\n');

const prompt = `You are a senior SRE reviewing 24-hour production logs for **starbunk-js** — a TypeScript Discord bot monorepo running four containers:
- **starbunk-bunkbot**: YAML-based reply bot (high message volume, webhook responses). Key log patterns: \`✓ TRIGGER FIRED\`, \`✓ BOT RESPONSE SENT\`, \`⚠ Error evaluating trigger\`
- **starbunk-bluebot**: Pattern-matching bot (detects "blue" references). Key log patterns: \`✓ STRATEGY MATCHED\`, \`✓ BOT RESPONSE SENT\`, \`Strategy evaluation error\`
- **starbunk-covabot**: AI personality bot (LLM-driven responses, PostgreSQL memory). Key log patterns: \`Response sent\`, \`LLM returned IGNORE\`, \`Error processing message\`, LLM timeout/error lines
- **starbunk-djcova**: Music/voice bot (YouTube/audio streams in voice channels). Key patterns: voice connection errors, ffmpeg failures, reconnection events

Logs are structured JSON (Pino/LogLayer format). Review the logs from **${date}** and write a concise GitHub Issue body in Markdown. Use these sections:

1. **Summary** — 2-3 sentences: overall log health, any serious findings
2. **Errors & Exceptions** — list specific errors with container, time, and what it means
3. **Warnings** — notable warnings that might become errors
4. **Silence / Activity Gaps** — any container that seems unusually quiet (no messages processed for extended periods). Silence can mean the bot is broken, not idle. Silence in bunkbot/bluebot after 6 AM UTC is suspicious.
5. **Trigger-Response Discrepancies** — for bunkbot and bluebot: look for \`TRIGGER FIRED\` log lines that are NOT followed by \`BOT RESPONSE SENT\` for the same bot/message context. Also flag: webhook errors, Discord permission errors (Missing Permissions / 403), any indication a response was attempted but failed silently. For covabot: flag cases where \`LLM returned IGNORE for a direct @mention\` (prompt compliance failure).
6. **Performance** — slow LLM calls (covabot), slow DB queries, high-latency Discord API calls, voice audio stutter (djcova)
7. **Patterns to Watch** — recurring issues, crash-restart cycles, error spikes at specific times
8. **Action Items** — checkboxes for anything that needs a human to look at

Rules:
- Only flag real problems. Skip routine info logs.
- Be specific: include container name, error message snippet, and approximate time.
- A trigger firing without a response is a **critical failure** — escalate it.
- An LLM timeout or all-providers-failed error in covabot means the bot was unable to respond to a real message — flag it.
- Voice disconnects that required manual intervention (djcova) should be flagged even if auto-recovered.

---

${logSections}
`;

console.log('Sending logs to Claude for analysis...');

let response;
try {
  response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
} catch (err) {
  console.error('Network error:', err.message);
  process.exit(1);
}

if (!response.ok) {
  const body = await response.text();
  console.error(`API error ${response.status}:`, body);
  process.exit(1);
}

const data = await response.json();
const analysis = data.content?.[0]?.text;

if (!analysis) {
  console.error('Unexpected API response:', JSON.stringify(data));
  process.exit(1);
}

const output = [
  `> 🤖 *Automated daily log analysis — ${date}*`,
  `> Run: [${process.env.GITHUB_RUN_ID ?? 'local'}](../../actions/runs/${process.env.GITHUB_RUN_ID ?? ''})`,
  '',
  analysis,
  '',
  '---',
  `*Input tokens: ${data.usage?.input_tokens ?? '?'} / Output tokens: ${data.usage?.output_tokens ?? '?'}*`,
].join('\n');

writeFileSync('prod-log-analysis.md', output, 'utf8');
console.log('Analysis written to prod-log-analysis.md');
console.log(`Tokens: ${data.usage?.input_tokens} in / ${data.usage?.output_tokens} out`);

// Exit non-zero if analysis flagged serious issues — lets the workflow decide whether to create an issue.
// Matches: critical failures, crashes, unhandled errors, trigger-response gaps, LLM failures, permission errors.
const hasSerious = analysis.toLowerCase().includes('critical') ||
  analysis.toLowerCase().includes('crash') ||
  analysis.toLowerCase().includes('unhandled') ||
  analysis.toLowerCase().includes('exception') ||
  analysis.toLowerCase().includes('trigger-response') ||
  analysis.toLowerCase().includes('discrepanc') ||
  analysis.toLowerCase().includes('missing permissions') ||
  analysis.toLowerCase().includes('all providers') ||
  analysis.toLowerCase().includes('llm timeout');

if (hasSerious) {
  console.log('::warning::Analysis flagged serious issues — check prod-log-analysis.md');
  writeFileSync('analysis-has-issues', '1', 'utf8');
}
