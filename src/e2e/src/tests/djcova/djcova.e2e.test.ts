/**
 * DJCova E2E tests
 *
 * Validates voice join and audio playback using the E2E text command handler
 * (!e2eplay / !e2estop) which is enabled in the DJCova container when
 * E2E_MODE=true.
 *
 * Flow:
 *   1. CI sender joins the E2E voice channel
 *   2. CI sender sends !e2eplay <TEST_AUDIO_URL> in the DJCova text channel
 *   3. DJCova receives the command, joins the same voice channel, starts playing
 *   4. CI sender's voice receiver captures audio packets → validates audio plays
 *   5. CI sender sends !e2estop → DJCova disconnects
 *   6. CI sender leaves the voice channel
 *
 * Environment:
 *   E2E_DJCOVA_TEST_AUDIO_URL  — short, reliable audio URL for CI
 *                                 (e.g. a short YouTube video, or a direct MP3)
 *   E2E_MODE=true              — must be set in the DJCova container
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { VoiceConnection } from '@discordjs/voice';
import { getE2EClient } from '@/harness/discord-e2e-client';
import { env, rateLimit } from '@/harness/test-env';

const CH = () => env.CHANNEL_DJCOVA;
const DJCOVA_ID = () => env.DJCOVA_BOT_ID;

// A short, stable test audio URL — set via env so it can be updated without code changes.
// Recommend a YouTube video under 30 seconds or a direct audio file.
const TEST_AUDIO_URL = process.env.E2E_DJCOVA_TEST_AUDIO_URL ?? '';

let voiceConnection: VoiceConnection | null = null;

describe('DJCova: voice join and audio playback', () => {
  beforeAll(async () => {
    if (!TEST_AUDIO_URL) {
      console.warn('[DJCova E2E] E2E_DJCOVA_TEST_AUDIO_URL not set — skipping audio tests');
    }
  });

  afterAll(async () => {
    // Always clean up: stop playback and leave voice
    const client = getE2EClient();
    try {
      await client.send(CH(), '!e2estop');
    } catch {
      // ignore if already stopped
    }
    if (voiceConnection) {
      client.leaveVoice(env.GUILD_ID);
      voiceConnection = null;
    }
  });

  beforeEach(rateLimit);

  it('E2E_MODE is enabled (DJCova responds to !e2eplay)', async () => {
    // If DJCova does NOT have E2E_MODE=true, it won't have the text handler
    // and the following tests will all time out. This guard gives a clear signal.
    if (!TEST_AUDIO_URL) return;

    const client = getE2EClient();

    // Joining voice first so the play command has somewhere to go
    voiceConnection = await client.joinVoice(env.VOICE_CHANNEL_DJCOVA, env.GUILD_ID);

    const replyPromise = client.waitForResponse(CH(), {
      timeout: 15_000,
      filter: m =>
        m.author.id === env.SENDER_BOT_ID &&
        (m.content.includes('E2E:') || m.content.includes('🎶')),
    });

    await client.send(CH(), `!e2eplay ${TEST_AUDIO_URL}`);
    const reply = await replyPromise;

    // Either "🎶 E2E: Now playing!" or an error message — both confirm handler is wired
    expect(reply.content).toMatch(/E2E|🎶/);
  });

  it('DJCova joins the E2E voice channel', async () => {
    if (!TEST_AUDIO_URL || !voiceConnection) return;

    const client = getE2EClient();

    await client.waitForBotInVoice(env.GUILD_ID, DJCOVA_ID(), env.VOICE_CHANNEL_DJCOVA, 15_000);

    // Re-fetch guild to confirm voice state
    const guild = await client.sender.guilds.fetch(env.GUILD_ID);
    await guild.members.fetch({ force: true });
    const djMember = guild.members.cache.get(DJCOVA_ID());
    expect(djMember?.voice.channelId).toBe(env.VOICE_CHANNEL_DJCOVA);
  });

  it('DJCova transmits audio packets to the CI sender', async () => {
    if (!TEST_AUDIO_URL || !voiceConnection) return;

    await getE2EClient().waitForAudioPackets(voiceConnection, DJCOVA_ID(), 20_000);
    // If we get here without throwing, audio is flowing
    expect(true).toBe(true);
  });

  it('DJCova stops and leaves voice channel after !e2estop', async () => {
    if (!TEST_AUDIO_URL || !voiceConnection) return;

    const client = getE2EClient();

    const stopReplyPromise = client.waitForResponse(CH(), {
      timeout: 10_000,
      filter: m => m.author.id === env.SENDER_BOT_ID && m.content.includes('E2E: Stopped'),
    });

    await client.send(CH(), '!e2estop');
    const stopReply = await stopReplyPromise;
    expect(stopReply.content).toContain('E2E: Stopped');

    // Give Discord a moment to update voice states
    await new Promise(r => setTimeout(r, 2_000));

    const guild = await client.sender.guilds.fetch(env.GUILD_ID);
    await guild.members.fetch({ force: true });
    const djMember = guild.members.cache.get(DJCOVA_ID());
    expect(djMember?.voice.channelId).toBeNull();

    // Clean up CI sender voice too
    client.leaveVoice(env.GUILD_ID);
    voiceConnection = null;
  });

  it('!e2eplay returns error when sender is not in a voice channel', async () => {
    if (!TEST_AUDIO_URL) return;

    // Ensure we're NOT in voice for this test
    const client = getE2EClient();
    client.leaveVoice(env.GUILD_ID);
    await new Promise(r => setTimeout(r, 1_000));

    const replyPromise = client.waitForResponse(CH(), {
      timeout: 10_000,
      filter: m => m.author.id === env.SENDER_BOT_ID && m.content.includes('E2E error'),
    });

    await client.send(CH(), `!e2eplay ${TEST_AUDIO_URL}`);
    const reply = await replyPromise;
    expect(reply.content).toMatch(/E2E error.*voice channel/i);
  });
});
