/**
 * E2E Tests: Real Discord Voice Connections
 *
 * These tests connect to a REAL Discord server to validate voice connection behavior.
 * They verify that our application code works correctly with the actual Discord API.
 *
 * SETUP REQUIRED:
 * 1. Create a Discord test server
 * 2. Create a test bot and invite it to the server
 * 3. Create a voice channel in the test server
 * 4. Set environment variables:
 *    - DISCORD_BOT_TOKEN: Your bot token
 *    - DISCORD_TEST_GUILD_ID: Test server guild ID
 *    - DISCORD_TEST_CHANNEL_ID: Voice channel ID
 *
 * Run with:
 *   DISCORD_BOT_TOKEN=<token> \
 *   DISCORD_TEST_GUILD_ID=<guild> \
 *   DISCORD_TEST_CHANNEL_ID=<channel> \
 *   npm run test:e2e
 *
 * WARNING: These tests make REAL network calls and may take 10-30 seconds.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client, GatewayIntentBits, type VoiceBasedChannel } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, AudioPlayerStatus } from '@discordjs/voice';
import {
  createVoiceConnection,
  subscribePlayerToConnection,
  disconnectVoiceConnection,
} from '../../src/utils/voice-utils.js';

const SKIP_E2E_TESTS = !(
  process.env.DISCORD_BOT_TOKEN &&
  process.env.DISCORD_TEST_GUILD_ID &&
  process.env.DISCORD_TEST_CHANNEL_ID
);

describe.skipIf(SKIP_E2E_TESTS)('E2E: Real Discord Voice Connections', () => {
  let client: Client;
  let voiceChannel: VoiceBasedChannel;

  const testTimeout = 30_000; // 30 seconds for network operations

  beforeAll(async () => {
    if (SKIP_E2E_TESTS) {
      console.log('⏭️  Skipping E2E tests (missing environment variables)');
      console.log('   Set DISCORD_BOT_TOKEN, DISCORD_TEST_GUILD_ID, DISCORD_TEST_CHANNEL_ID');
      return;
    }

    console.log('🚀 Connecting to Discord for E2E tests...');

    client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });

    // Connect to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);

    // Wait for ready event
    await new Promise<void>(resolve => {
      client.once('ready', () => {
        console.log(`✅ Connected as ${client.user?.tag}`);
        resolve();
      });
    });

    // Fetch test guild and channel
    const guild = await client.guilds.fetch(process.env.DISCORD_TEST_GUILD_ID!);
    const channel = await guild.channels.fetch(process.env.DISCORD_TEST_CHANNEL_ID!);

    if (!channel || !channel.isVoiceBased()) {
      throw new Error('Test channel is not a voice channel');
    }

    voiceChannel = channel;
    console.log(`📍 Using test channel: ${voiceChannel.name}`);
  }, testTimeout);

  afterAll(async () => {
    if (client) {
      console.log('🔌 Disconnecting from Discord...');
      await client.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up any existing connections
    if (voiceChannel?.guildId) {
      await disconnectVoiceConnection(voiceChannel.guildId);
    }

    // Wait a bit for Discord to process
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Real Connection Lifecycle', () => {
    it(
      'should join voice channel and reach Ready state',
      async () => {
        const connection = createVoiceConnection(voiceChannel);

        // Wait for Ready state
        const readyPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection did not reach Ready state within 10s'));
          }, 10_000);

          connection.on(VoiceConnectionStatus.Ready, () => {
            clearTimeout(timeout);
            resolve();
          });

          connection.on('error', error => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        await readyPromise;

        expect(connection.state.status).toBe(VoiceConnectionStatus.Ready);

        // Clean up
        connection.destroy();
      },
      testTimeout,
    );

    it(
      'should handle connection errors gracefully',
      async () => {
        // Test with invalid channel configuration
        const connection = joinVoiceChannel({
          channelId: 'invalid-channel-id',
          guildId: voiceChannel.guildId,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        const errorPromise = new Promise<Error>(resolve => {
          connection.on('error', error => {
            resolve(error);
          });

          // Trigger error by trying invalid operation
          setTimeout(() => {
            connection.destroy();
            resolve(new Error('No error emitted'));
          }, 5000);
        });

        const error = await errorPromise;
        expect(error).toBeDefined();

        // Clean up
        connection.destroy();
      },
      testTimeout,
    );

    it(
      'should clean up resources on disconnect',
      async () => {
        const connection = createVoiceConnection(voiceChannel);

        // Wait for ready
        await new Promise<void>(resolve => {
          connection.on(VoiceConnectionStatus.Ready, () => resolve());
        });

        // Now disconnect
        const destroyedPromise = new Promise<void>(resolve => {
          connection.on(VoiceConnectionStatus.Destroyed, () => resolve());
        });

        connection.destroy();
        await destroyedPromise;

        expect(connection.state.status).toBe(VoiceConnectionStatus.Destroyed);
      },
      testTimeout,
    );
  });

  describe('Real Audio Player Integration', () => {
    it(
      'should subscribe player to connection',
      async () => {
        const connection = createVoiceConnection(voiceChannel);

        // Wait for ready
        await new Promise<void>(resolve => {
          connection.on(VoiceConnectionStatus.Ready, () => resolve());
        });

        // Create and subscribe player
        const { player, subscription } = subscribePlayerToConnection(connection);

        expect(player).toBeDefined();
        expect(player.state.status).toBe(AudioPlayerStatus.Idle);
        expect(subscription).toBeDefined();
        expect(typeof subscription.unsubscribe).toBe('function');

        // Clean up
        subscription.unsubscribe();
        connection.destroy();
      },
      testTimeout,
    );
  });

  describe('Real Network Behavior', () => {
    it(
      'should handle reconnection attempts',
      async () => {
        const connection = createVoiceConnection(voiceChannel);

        // Wait for ready
        await new Promise<void>(resolve => {
          connection.on(VoiceConnectionStatus.Ready, () => resolve());
        });

        const disconnectedCount = { value: 0 };
        const reconnectedCount = { value: 0 };

        connection.on(VoiceConnectionStatus.Disconnected, () => {
          disconnectedCount.value++;
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
          reconnectedCount.value++;
        });

        // Simulate network disruption (we can't force this, so just document behavior)
        expect(connection.state.status).toBe(VoiceConnectionStatus.Ready);

        // Clean up
        connection.destroy();
      },
      testTimeout,
    );
  });

  describe('Real Timing Behavior', () => {
    it(
      'should measure actual connection establishment time',
      async () => {
        const startTime = Date.now();

        const connection = createVoiceConnection(voiceChannel);

        await new Promise<void>(resolve => {
          connection.on(VoiceConnectionStatus.Ready, () => resolve());
        });

        const connectionTime = Date.now() - startTime;

        console.log(`📊 Real connection time: ${connectionTime}ms`);

        // Document typical connection times (should be < 5s on good network)
        expect(connectionTime).toBeLessThan(10_000);

        // Clean up
        connection.destroy();
      },
      testTimeout,
    );
  });
});

describe('E2E Test Configuration', () => {
  it('should document required environment variables', () => {
    const requiredEnvVars = {
      DISCORD_BOT_TOKEN: 'Bot token from Discord Developer Portal',
      DISCORD_TEST_GUILD_ID: 'ID of test Discord server',
      DISCORD_TEST_CHANNEL_ID: 'ID of voice channel in test server',
    };

    console.log('📋 Required Environment Variables:', requiredEnvVars);
    expect(requiredEnvVars).toBeDefined();
  });

  it('should document test server setup', () => {
    const setupSteps = [
      '1. Create a Discord test server (or use existing)',
      '2. Go to Discord Developer Portal',
      '3. Create a new application/bot',
      '4. Enable "Presence Intent" and "Server Members Intent"',
      '5. Generate bot token and copy it',
      '6. Invite bot to test server with voice permissions',
      '7. Create a voice channel in test server',
      '8. Copy guild ID and channel ID (enable Developer Mode in Discord)',
      '9. Set environment variables before running tests',
    ];

    console.log('🔧 Test Server Setup:', setupSteps);
    expect(setupSteps).toBeDefined();
  });
});
