import 'dotenv/config';
import { WebhookClient, Client, GatewayIntentBits, Message, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';

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

function parseMonitorTokenFromWebhookUrl(url: string | undefined | null): string | undefined {
	if (!url) return undefined;
	try {
		const u = new URL(url);
		// Support both monitor_token and monitorToken for convenience
		return u.searchParams.get('monitor_token') || u.searchParams.get('monitorToken') || undefined;
	} catch {
		return undefined;
	}
}

function getMonitorToken(): string {
	const fromEnv = process.env.E2E_MONITOR_TOKEN;
	const fromWebhook = parseMonitorTokenFromWebhookUrl(WEBHOOK_URL);
	const token = fromEnv || fromWebhook || '';
	if (!token) {
		throw new Error(
			'Missing monitor token. Set E2E_MONITOR_TOKEN or append ?monitor_token=... to E2E_TEST_WEBHOOK_URL for local testing.',
		);
	}
	if (token === process.env.BUNKBOT_TOKEN || token === process.env.STARBUNK_TOKEN) {
		log('WARN: Monitor token matches bot token; running both simultaneously can cause disconnects.');
	}
	return token;
}

const MONITOR_TOKEN = getMonitorToken();

const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT_MS || '20000', 10);
const INCLUDE_CHANCE = process.env.E2E_INCLUDE_CHANCE_BOTS === 'true';
const CHANCE_ATTEMPTS = parseInt(process.env.E2E_CHANCE_ATTEMPTS || '5', 10);
function detectAvailableBots(): string[] {
	const botsDir = path.resolve(__dirname, '../../src/reply-bots');
	try {
		const entries = fs.readdirSync(botsDir, { withFileTypes: true });
		return entries.filter((e) => e.isDirectory() && e.name.endsWith('-bot')).map((e) => e.name);
	} catch {
		return [];
	}
}

const ABORT_AFTER = parseInt(process.env.E2E_ABORT_AFTER || '5', 10);
let consecutiveFailures = 0;
let gatewayEventCount = 0;

function extractWebhookId(url: string | undefined | null): string | undefined {
	if (!url) return undefined;
	const match = String(url).match(/webhooks\/(\d+)\//);
	return match ? match[1] : undefined;
}
const E2E_WEBHOOK_ID = extractWebhookId(WEBHOOK_URL) || '';

const DELAY_MS = parseInt(process.env.E2E_DELAY_MS || '3500', 10);

// E2EStatusBot diagnostics prefixes
const E2E_LOADED_PREFIX = '[E2E_LOADED_BOTS]';
const E2E_IDENT_PREFIX = '[E2E_REQUIRED_IDENTITIES]';

// Canonicalize names (remove non-alphanumerics, lowercase) to be robust to spaces/dashes
function canonicalName(s: string): string {
	return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function expectedBotNameForCase(name: string): string | undefined {
	// Map case labels to actual bot display names where they differ
	if (name.startsWith('BluBot')) return 'BlueBot';
	if (name.startsWith('SpiderBot')) return 'Spider-Bot';
	if (name === 'MacaroniBot') return 'Macaroni Bot';
	if (name === 'MusicCorrectBot') return 'Music Correct Bot';
	if (name === 'AttitudeBot') return 'Xander Crews';
	if (name.includes('VennBot')) return 'VennBot';
	if (name === 'PickleBot') return 'GremlinBot';
	if (name === 'EzioBot') return 'Ezio Auditore Da Firenze';
	const direct = name.replace(/:.*/, '');
	return direct;
}

function isIdentityDependent(botName?: string): boolean {
	return botName === 'VennBot' || botName === 'GuyBot' || botName === 'SigGreatBot';
}

function delayOverrideForCase(name: string): number | undefined {
	if (name === 'BluBot: acknowledge') return 4000;
	if (name === 'BananaBot') return 5000;
	if (name === 'PickleBot' || name === 'CheckBot') return 3000;
	if (name === 'MacaroniBot' || name === 'ChaosBot' || name === 'HoldBot') return 3500;
	if (name === 'SheeshBot' || name === 'GundamBot' || name === 'EzioBot') return 3500;
	if (name === 'BabyBot' || name === 'AttitudeBot') return 4000;
	if (name === 'MusicCorrectBot') return 8000;
	if (name === 'SpiderBot (incorrect)') return 5000;
	if (name === 'NiceBot') return 3000;
	return undefined;
}

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
	...(process.env.E2E_INCLUDE_CHANCE_BOTS === 'true'
		? [
				{ name: 'HomonymBot (chance)', content: 'I need to buy some flour to bake a flower cake' },
				{ name: 'ChadBot (chance)', content: 'this is the chad moment' },
				{ name: 'InterruptBot (chance)', content: 'I was going to say something very important but' },
				{ name: 'BotBot (chance)', content: 'triggering via bot may or may not be handled here' },
			]
		: []),

	// Chance-based or identity-dependent (may be flaky): HomonymBot, ChadBot, BotBot, InterruptBot, VennBot random
];

async function sleep(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
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

async function monitorForResponses(
	client: Client,
	since: number,
	expectAny = true,
	ignoreContent?: string,
	waitMs?: number,
): Promise<Message[]> {
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

	await sleep(waitMs ?? DELAY_MS);
	// Return what we have after delay
	client.off('messageCreate', handler);

	if (expectAny && collected.length === 0) {
		throw new Error('No responses collected in time');
	}
	return collected;
}
async function verifyWebhookDelivery(client: Client, since: number, content: string): Promise<boolean> {
	try {
		const ch = await client.channels.fetch(CHANNEL_ID);
		// Narrow to text channel type that supports messages.fetch
		if (!ch || !('messages' in ch)) return false;
		const textCh = ch as any;
		const msgs = await textCh.messages.fetch({ limit: 50 });
		for (const [, msg] of msgs) {
			if (
				msg.createdTimestamp > since &&
				msg.webhookId &&
				msg.content?.trim() === content.trim() &&
				(!E2E_WEBHOOK_ID || msg.webhookId === E2E_WEBHOOK_ID)
			) {
				return true;
			}
		}
		return false;
	} catch {
		return false;
	}
}
type PreflightInfo = { loadedBots: Set<string>; identities: Record<string, 'ok' | 'missing'> };

async function preflightDiagnostics(client: Client): Promise<PreflightInfo | undefined> {
	try {
		const since = Date.now();
		await postViaWebhook('e2e: list bots');
		const msgs = await monitorForResponses(client, since, false, 'e2e: list bots', 3000);
		const text = msgs.map((m) => m.content || '').join('\n');

		const lines = text.split('\n');
		const loadedMatch = lines.find((l) => l.startsWith(E2E_LOADED_PREFIX));
		const identMatch = lines.find((l) => l.startsWith(E2E_IDENT_PREFIX));
		if (!loadedMatch || !identMatch) {
			log('Preflight: did not receive diagnostics from E2EStatusBot (continuing without skips).');
			return undefined;
		}

		const loadedStr = loadedMatch.slice(E2E_LOADED_PREFIX.length).trim();
		const loadedBots = new Set<string>(
			(loadedStr ? loadedStr.split(',') : []).map((s) => s.trim()).filter(Boolean),
		);

		const identStr = identMatch.slice(E2E_IDENT_PREFIX.length).trim();
		const identities: Record<string, 'ok' | 'missing'> = {};
		identStr
			.split(',')
			.map((s) => s.trim())
			.forEach((pair) => {
				const [k, v] = pair.split(':');
				if (k && v && (v === 'ok' || v === 'missing')) identities[k.toLowerCase()] = v;
			});

		return { loadedBots, identities };
	} catch (e) {
		log('Preflight error (non-fatal):', e);
		return undefined;
	}
}

async function abortEarly(client: Client, webhookSeen: boolean) {
	log('Early abort: consecutive failures threshold reached. Gathering diagnostics...');

	const diagnostics: string[] = [];

	// Helper to run shell commands safely
	const tryCmd = (cmd: string) => {
		try {
			const out = execSync(cmd, { stdio: 'pipe' }).toString().trim();
			return out || '(no output)';
		} catch (e: any) {
			return `ERROR running "${cmd}": ${e?.message || e}`;
		}
	};

	// 1) Container status
	diagnostics.push('Container status:');
	diagnostics.push('```');
	diagnostics.push(`docker compose ps bunkbot:\n${tryCmd('docker compose ps bunkbot')}`);
	diagnostics.push(`docker ps (filter):\n${tryCmd('docker ps --filter name=starbunk-bunkbot')}`);
	diagnostics.push(`podman ps (filter):\n${tryCmd('podman ps --filter name=starbunk-bunkbot')}`);
	diagnostics.push('```');

	// 2) Webhook visibility
	diagnostics.push(`Webhook post visibility (monitor saw webhook message): ${webhookSeen}`);

	// 3) Discord Gateway events
	diagnostics.push(`Discord Gateway messageCreate events in channel since start: ${gatewayEventCount}`);

	// 4) Environment/state summary
	const debug = process.env.DEBUG_MODE === 'true';
	const e2eEnabled = process.env.E2E_ALLOW_WEBHOOK_TESTS === 'true';
	diagnostics.push('Environment summary:');
	diagnostics.push('```');
	diagnostics.push(`DEBUG_MODE=${debug}`);
	diagnostics.push(`TESTING_CHANNEL_IDS=${process.env.TESTING_CHANNEL_IDS || ''}`);
	diagnostics.push(`E2E_ALLOW_WEBHOOK_TESTS=${e2eEnabled}`);
	diagnostics.push(`CHANNEL_ID=${CHANNEL_ID}`);
	diagnostics.push(`E2E_WEBHOOK_ID=${E2E_WEBHOOK_ID || '(unknown)'}`);
	diagnostics.push('```');

	// Troubleshooting suggestions
	const suggestions = [
		'Troubleshooting suggestions:',
		'1) Check BunkBot container status:',
		'   - docker compose ps bunkbot',
		'   - docker compose logs -f bunkbot',
		'2) Verify filtering settings:',
		'   - DEBUG_MODE=true',
		'   - TESTING_CHANNEL_IDS includes the test channel',
		'   - E2E_ALLOW_WEBHOOK_TESTS=true',
		'3) Confirm webhook posts reach the channel (and monitor can see them):',
		'   - Webhook URL points to the same channel as E2E_TEST_CHANNEL_ID',
		'4) Check Discord Gateway connectivity:',
		'   - Low/zero gateway events suggests connectivity or permissions issues',
	];

	const body = ['**Early abort: systemic issue suspected**', '', ...diagnostics, '', ...suggestions].join('\n');

	log(body);

	// Attempt to post an embed to the channel webhook for visibility
	try {
		const embed = new EmbedBuilder()
			.setTitle('BunkBot E2E aborted early')
			.setDescription(body.slice(0, 4000))
			.setColor(0xe74c3c)
			.setTimestamp(new Date());
		const wh = new WebhookClient({ url: WEBHOOK_URL });
		await wh.send({ embeds: [embed] });
	} catch (err) {
		log('WARN: failed to post abort embed:', err);
	}

	// Exit with explicit infra/connectivity error code
	log('Exiting with code 2 to indicate infrastructure/connectivity problem.');
	process.exit(2);
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
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
	});

	await withTimeout(
		new Promise<void>((resolve, reject) => {
			client.once('ready', () => {
				log('Monitor client ready as', client.user?.tag);
				resolve();
			});
			// Count gateway message events in target channel for diagnostics
			client.on('messageCreate', (m: Message) => {
				try {
					if (m.channelId === CHANNEL_ID) gatewayEventCount++;
				} catch {}
			});

			client.login(MONITOR_TOKEN).catch(reject);
		}),
		TIMEOUT_MS,
		'Discord login',
	);

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

	// Preflight diagnostics (non-fatal if missing)
	const preflight = await preflightDiagnostics(client);

	const results: TestResult[] = [];

	for (const tc of testCases) {
		const botName = expectedBotNameForCase(tc.name);

		// Skip logic based on preflight
		if (preflight && botName) {
			const loadedCanon = new Set(Array.from(preflight.loadedBots).map(canonicalName));
			if (!loadedCanon.has(canonicalName(botName))) {
				results.push({
					name: tc.name,
					content: tc.content,
					ok: true,
					replies: 0,
					durationMs: 0,
					details: 'SKIPPED (not loaded)',
				});
				log(`Result for ${tc.name}: SKIPPED (not loaded)`);
				continue;
			}
			if (isIdentityDependent(botName)) {
				const key = botName.replace('Bot', '').toLowerCase(); // venn/guy/siggreat
				const status = preflight.identities[key as 'venn' | 'guy' | 'siggreat'];
				if (status !== 'ok') {
					results.push({
						name: tc.name,
						content: tc.content,
						ok: true,
						replies: 0,
						durationMs: 0,
						details: 'SKIPPED (identity unavailable)',
					});
					log(`Result for ${tc.name}: SKIPPED (identity unavailable)`);
					continue;
				}
			}
		}

		log(`Posting test case: ${tc.name} -> "${tc.content}"`);

		const attempts = INCLUDE_CHANCE && tc.name.includes('(chance)') ? CHANCE_ATTEMPTS : 1;
		let aggregated: Message[] = [];
		let webhookSeenAny = false;
		const waitMs = delayOverrideForCase(tc.name) ?? DELAY_MS;

		const start = Date.now();
		for (let i = 0; i < attempts; i++) {
			const since = Date.now();
			await postViaWebhook(tc.content);
			try {
				const seen = await verifyWebhookDelivery(client, since, tc.content);
				webhookSeenAny = webhookSeenAny || seen;
			} catch {}
			try {
				const responses = await withTimeout(
					monitorForResponses(client, since, false, tc.content, waitMs),
					TIMEOUT_MS,
					'Wait for responses',
				);
				aggregated = aggregated.concat(responses);
			} catch (e) {
				// ignore per-attempt timeout; we aggregate across attempts
			}
			await sleep(waitMs);
		}

		const durationMs = Date.now() - start;
		const botReplies = aggregated.filter((m) => m.author.bot);
		const ok = botReplies.length > 0;
		results.push({
			name: tc.name,
			content: tc.content,
			ok,
			replies: botReplies.length,
			durationMs,
			details: ok ? undefined : 'No replies',
		});
		log(`Result for ${tc.name}: ${ok ? 'OK' : 'NO REPLY'} in ${durationMs}ms`);

		if (!ok) {
			consecutiveFailures++;
			if (consecutiveFailures >= ABORT_AFTER) {
				await abortEarly(client, webhookSeenAny);
				return; // safety
			}
		} else {
			consecutiveFailures = 0;
		}
	}

	log('E2E summary:');
	const isSkipped = (r: TestResult) => (r.details || '').startsWith('SKIPPED');
	for (const r of results) {
		const label = isSkipped(r) ? 'SKIPPED' : r.ok ? 'PASS' : 'FAIL';
		log(` - ${r.name}: ${label}${r.details ? ` (${r.details})` : ''}`);
	}

	// Exit code logic
	const allFail = results.every((r) => !r.ok && !isSkipped(r));
	const failureThreshold = parseInt(process.env.E2E_FAILURE_THRESHOLD || '1', 10); // max failures to still pass
	const failedCount = results.filter((r) => !r.ok && !isSkipped(r)).length;
	if (allFail) {
		log('All tests failed; treating run as SKIPPED (non-blocking).');
		process.exit(0);
	}

	const allOk = results.every((r) => r.ok || isSkipped(r));
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
		'AttitudeBot',
		'BabyBot',
		'BananaBot',
		'BluBot: mention',
		'BluBot: acknowledge',
		'ChaosBot',
		'CheckBot',
		'EzioBot',
		'GundamBot',
		'GuyBot',
		'HoldBot',
		'MacaroniBot',
		'MusicCorrectBot',
		'NiceBot',
		'PickleBot',
		'SheeshBot',
		'SigGreatBot',
		'SpiderBot (incorrect)',
		'SpiderBot (correct)',
		'VennBot (cringe)',
	];
	const chanceNames = ['HomonymBot (chance)', 'ChadBot (chance)', 'InterruptBot (chance)', 'BotBot (chance)'];
	const testedNames = results.map((r) => r.name);

	const inventorySection = [
		'**Bot Inventory**',
		'```',
		...inventoryList.map((n) => {
			const display = n.replace(/-bot$/, '');
			if (
				deterministicNames.includes(display) ||
				deterministicNames.includes(display + ': mention') ||
				deterministicNames.includes(display + ': acknowledge')
			) {
				return `✓ ${n} — tested (deterministic)`;
			}
			if (chanceNames.some((c) => c.startsWith(display))) {
				return INCLUDE_CHANCE ? `~ ${n} — tested (chance)` : `- ${n} — excluded (chance-based)`;
			}
			if (n === 'cova-bot') {
				return '- cova-bot — excluded (LLM/identity)';
			}
			if (n === 'example-bot') {
				return '- example-bot — excluded (example)';
			}
			// default
			const matched = testedNames.find((t) => t.toLowerCase().startsWith(display.toLowerCase()));
			return matched ? `✓ ${n} — tested` : `? ${n} — status unknown`;
		}),
		'```',
	].join('\n');
	const client = new WebhookClient({ url: WEBHOOK_URL });

	const total = results.length;
	const passed = results.filter((r) => r.ok).length;
	const failed = total - passed;
	const status = failed === 0 ? '✅ PASSED' : passed === 0 ? '❌ FAILED' : '⚠️ MIXED';
	const ts = new Date().toISOString();

	// Build a readable details section
	const lines = results.map((r) => {
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
		inventorySection,
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
		.setColor(failed === 0 ? 0x2ecc71 : passed === 0 ? 0xe74c3c : 0xf1c40f)
		.setTimestamp(new Date());

	if (commit) embed.setFooter({ text: `commit ${commit.slice(0, 12)}` });
	await client.send({ embeds: [embed] });
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
