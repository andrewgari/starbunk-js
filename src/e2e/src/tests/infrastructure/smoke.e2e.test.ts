/**
 * Infrastructure smoke tests
 *
 * These run first. They validate the plumbing before any bot-specific tests:
 *   - CI sender can connect to Discord
 *   - CI sender can send + read messages
 *   - All four bots are visible in the guild
 *   - Webhook responses are visible to the CI sender
 *   - All bots respond to basic health triggers
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getE2EClient } from '@/harness/discord-e2e-client';
import { env, rateLimit } from '@/harness/test-env';

describe('Infrastructure: Discord connectivity', () => {
  it('sender client is connected and has a user ID', () => {
    const client = getE2EClient();
    expect(client.sender.user?.id).toBe(env.SENDER_BOT_ID);
  });

  it('sender can send a message to the infra test channel', async () => {
    const client = getE2EClient();
    const msg = await client.send(env.CHANNEL_INFRA, 'E2E infrastructure ping');
    expect(msg.content).toBe('E2E infrastructure ping');
    expect(msg.channelId).toBe(env.CHANNEL_INFRA);
  });

  it('sender can read its own sent message via messageCreate event', async () => {
    const client = getE2EClient();

    const responsePromise = client.waitForResponse(env.CHANNEL_INFRA, {
      timeout: 5_000,
      filter: msg => msg.content === 'E2E echo test' && msg.author.id === env.SENDER_BOT_ID,
    });

    // Override filter to accept own message for this specific echo test
    // (we want to confirm the messageCreate event fires at all)
    const echoPromise = new Promise<boolean>(resolve => {
      const handler = (msg: { content: string; author: { id: string } }) => {
        if (msg.content === 'E2E echo test' && msg.author.id === env.SENDER_BOT_ID) {
          resolve(true);
        }
      };
      client.sender.once('messageCreate', handler as Parameters<typeof client.sender.once>[1]);
      setTimeout(() => resolve(false), 5_000);
    });

    await client.send(env.CHANNEL_INFRA, 'E2E echo test');
    const received = await echoPromise;
    expect(received).toBe(true);
  });
});

describe('Infrastructure: All bots are online', () => {
  const bots: Array<[string, keyof typeof env]> = [
    ['BunkBot', 'BUNKBOT_BOT_ID'],
    ['BlueBot', 'BLUEBOT_BOT_ID'],
    ['CovaBot', 'COVABOT_BOT_ID'],
    ['DJCova', 'DJCOVA_BOT_ID'],
  ];

  for (const [name, idKey] of bots) {
    it(`${name} is present in the test guild`, async () => {
      const client = getE2EClient();
      const online = await client.isBotOnline(env.GUILD_ID, env[idKey]);
      expect(online, `${name} was not found in guild ${env.GUILD_ID}`).toBe(true);
    });
  }
});

describe('Infrastructure: BunkBot — basic send + webhook response', () => {
  beforeAll(rateLimit);

  it('BunkBot responds to a known trigger via webhook', async () => {
    const client = getE2EClient();

    const responsePromise = client.waitForWebhookResponse(env.CHANNEL_BUNKBOT, {
      webhookUsername: 'E2EWordBot',
      contentIncludes: ['word trigger fired'],
      timeout: 10_000,
    });

    await client.send(env.CHANNEL_BUNKBOT, 'e2e_word');
    const response = await responsePromise;

    expect(response.webhookId).toBeTruthy();
    expect(response.author.username).toBe('E2EWordBot');
    expect(response.content).toBe('word trigger fired');
  });
});

describe('Infrastructure: BlueBot — basic send + direct message response', () => {
  beforeAll(rateLimit);

  it('BlueBot responds via direct channel.send (not webhook)', async () => {
    const client = getE2EClient();

    const responsePromise = client.waitForBotMessage(env.CHANNEL_BLUEBOT, {
      botId: env.BLUEBOT_BOT_ID,
      contentIncludes: ['Did somebody say Blu?'],
      timeout: 10_000,
    });

    await client.send(env.CHANNEL_BLUEBOT, 'blue');
    const response = await responsePromise;

    expect(response.webhookId).toBeNull();
    expect(response.author.id).toBe(env.BLUEBOT_BOT_ID);
  });
});

describe('Infrastructure: DJCova — slash commands registered', () => {
  it('DJCova has /play, /stop, /volume registered in the test guild', async () => {
    const { REST } = await import('@discordjs/rest');
    const { Routes } = await import('discord-api-types/v10');

    const rest = new REST({ version: '10' }).setToken(env.SENDER_TOKEN);
    const appId = env.DJCOVA_BOT_ID; // application ID = bot user ID for single-app bots

    const commands = (await rest.get(
      Routes.applicationGuildCommands(appId, env.GUILD_ID),
    )) as Array<{ name: string }>;

    const names = commands.map(c => c.name);
    expect(names).toContain('play');
    expect(names).toContain('stop');
    expect(names).toContain('volume');
  });
});
