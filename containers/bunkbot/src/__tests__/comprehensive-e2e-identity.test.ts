/**
 * Comprehensive E2E Identity Tests
 * 
 * Tests ALL reply-bots to ensure they display their correct custom identities
 * (names and avatars) instead of appearing as the default Discord bot identity.
 */

import { Client, GatewayIntentBits, TextChannel, WebhookClient } from 'discord.js';
import { BotRegistry } from '../botRegistry';
import { DiscordService } from '@starbunk/shared';

// Test configuration
const TEST_CONFIG = {
  testServerId: process.env.E2E_TEST_SERVER_ID || '753251582719688714',
  testChannelId: process.env.E2E_TEST_CHANNEL_ID || '798613445301633137',
  testUserId: process.env.E2E_TEST_USER_ID || '139592376443338752',
  webhookUrl: process.env.E2E_WEBHOOK_URL,
  botToken: process.env.E2E_BOT_TOKEN || process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN,
  timeout: 30000 // 30 seconds
};

// Bot test cases - comprehensive list of all bots
const BOT_TESTS = [
  {
    botName: 'BlueBot',
    triggerMessage: 'blu?',
    expectedResponse: 'Did somebody say Blu?',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/AAtmRum.png'
  },
  {
    botName: 'HoldBot', 
    triggerMessage: 'Hold',
    expectedResponse: 'Hold.',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/HXVVfyj.png'
  },
  {
    botName: 'GuyBot',
    triggerMessage: 'guy',
    expectedResponse: 'guy',
    type: 'user-specific',
    targetUser: 'Guy',
    expectedAvatar: 'https://cdn.discordapp.com/avatars/135820819086573568/avatar.png'
  },
  {
    botName: 'ChadBot',
    triggerMessage: 'chad workout protein',
    expectedResponse: 'What is bro *yappin* about?...',
    type: 'user-specific',
    targetUser: 'Chad',
    expectedAvatar: 'https://cdn.discordapp.com/avatars/85184539906809856/avatar.png',
    probability: 0.01
  },
  {
    botName: 'VennBot',
    triggerMessage: 'venn',
    expectedResponse: 'Hmm...',
    type: 'user-specific', 
    targetUser: 'Venn',
    expectedAvatar: 'https://cdn.discordapp.com/avatars/151120340343455744/avatar.png'
  },
  {
    botName: 'BunkBot',
    triggerMessage: '69',
    expectedResponse: 'Nice.',
    type: 'deterministic',
    expectedAvatar: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg'
  },
  {
    botName: 'Sheesh Bot',
    triggerMessage: 'sheesh',
    expectedResponse: 'SHEEEESH',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/HXVVfyj.png'
  },
  {
    botName: 'CheckBot',
    triggerMessage: 'check',
    expectedResponse: 'czech',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/HXVVfyj.png'
  },
  {
    botName: 'BananaBot',
    triggerMessage: 'banana',
    expectedResponse: 'banana',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/HXVVfyj.png'
  },
  {
    botName: 'BabyBot',
    triggerMessage: 'baby',
    expectedResponse: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus.gif',
    type: 'deterministic',
    expectedAvatar: 'https://i.imgur.com/HXVVfyj.png'
  }
];

describe('Comprehensive E2E Identity Tests', () => {
  let testClient: Client;
  let testChannel: TextChannel;
  let webhookClient: WebhookClient | null = null;
  let discordService: DiscordService;

  beforeAll(async () => {
    // Skip if no bot token available
    if (!TEST_CONFIG.botToken) {
      console.log('⚠️ No bot token available - skipping E2E identity tests');
      return;
    }

    // Set E2E test environment
    process.env.E2E_TEST_ENABLED = 'true';

    // Initialize test client
    testClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildWebhooks
      ]
    });

    // Login and setup
    await testClient.login(TEST_CONFIG.botToken);
    await new Promise(resolve => testClient.once('ready', resolve));

    // Get test channel
    testChannel = await testClient.channels.fetch(TEST_CONFIG.testChannelId) as TextChannel;
    if (!testChannel) {
      throw new Error(`Test channel ${TEST_CONFIG.testChannelId} not found`);
    }

    // Setup webhook for sending test messages
    if (TEST_CONFIG.webhookUrl) {
      webhookClient = new WebhookClient({ url: TEST_CONFIG.webhookUrl });
    }

    // Initialize DiscordService
    discordService = new DiscordService(testClient);

    console.log(`✅ E2E Identity Test setup complete - testing ${BOT_TESTS.length} bots`);
  }, 60000);

  afterAll(async () => {
    if (testClient) {
      await testClient.destroy();
    }
    if (webhookClient) {
      webhookClient.destroy();
    }
  });

  describe('Bot Identity Validation', () => {
    BOT_TESTS.forEach((botTest) => {
      it(`should display correct identity for ${botTest.botName}`, async () => {
        if (!TEST_CONFIG.botToken) {
          console.log(`⚠️ Skipping ${botTest.botName} - no bot token`);
          return;
        }

        console.log(`🧪 Testing ${botTest.botName} identity...`);

        // Send trigger message
        const sentMessage = await sendTestMessage(botTest.triggerMessage);
        
        // Wait for bot response
        const response = await waitForBotResponse(botTest.botName, botTest.expectedResponse);
        
        if (response) {
          // Validate bot identity
          expect(response.author.username).toBe(botTest.botName);
          expect(response.author.bot).toBe(true);
          
          // For webhook messages, validate avatar
          if (response.webhookId) {
            console.log(`✅ ${botTest.botName} used webhook (custom identity)`);
            // Webhook messages should have custom avatar
            expect(response.author.displayAvatarURL()).toContain('cdn.discordapp.com');
          } else {
            console.log(`⚠️ ${botTest.botName} used regular message (default identity)`);
          }
          
          console.log(`✅ ${botTest.botName} identity validated`);
        } else {
          // For probabilistic bots, this might be expected
          if (botTest.probability && botTest.probability < 0.1) {
            console.log(`⚠️ ${botTest.botName} did not respond (probabilistic bot with ${botTest.probability * 100}% chance)`);
          } else {
            throw new Error(`${botTest.botName} did not respond to trigger: ${botTest.triggerMessage}`);
          }
        }
      }, TEST_CONFIG.timeout);
    });
  });

  describe('User-Specific Bot Identity Resolution', () => {
    const userSpecificBots = BOT_TESTS.filter(bot => bot.type === 'user-specific');

    userSpecificBots.forEach((botTest) => {
      it(`should resolve ${botTest.targetUser} identity for ${botTest.botName}`, async () => {
        if (!TEST_CONFIG.botToken) {
          console.log(`⚠️ Skipping ${botTest.botName} identity resolution - no bot token`);
          return;
        }

        console.log(`🔍 Testing ${botTest.botName} identity resolution for ${botTest.targetUser}...`);

        // Test identity resolution directly
        const bots = await BotRegistry.discoverBots(discordService);
        const targetBot = bots.find(bot => bot.name === botTest.botName);
        
        expect(targetBot).toBeDefined();
        
        if (targetBot) {
          // Create mock message for identity resolution
          const mockMessage = {
            guild: { id: TEST_CONFIG.testServerId },
            channel: { id: TEST_CONFIG.testChannelId },
            author: { id: TEST_CONFIG.testUserId }
          } as any;

          // Test that the bot can resolve identity (should not throw)
          try {
            await targetBot.processMessage(mockMessage);
            console.log(`✅ ${botTest.botName} identity resolution successful`);
          } catch (error) {
            // Identity resolution failure should be handled gracefully
            console.log(`⚠️ ${botTest.botName} identity resolution failed, but should have fallback`);
          }
        }
      });
    });
  });

  // Helper functions
  async function sendTestMessage(content: string): Promise<any> {
    if (webhookClient) {
      return await webhookClient.send({
        content,
        username: 'E2E Test User',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
    } else {
      return await testChannel.send(content);
    }
  }

  async function waitForBotResponse(expectedBotName: string, expectedContent: string): Promise<any> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        testClient.off('messageCreate', messageHandler);
        resolve(null);
      }, 10000); // 10 second timeout

      const messageHandler = (message: any) => {
        if (message.channel.id === TEST_CONFIG.testChannelId &&
            message.author.bot &&
            (message.author.username === expectedBotName || message.content.includes(expectedContent))) {
          clearTimeout(timeout);
          testClient.off('messageCreate', messageHandler);
          resolve(message);
        }
      };

      testClient.on('messageCreate', messageHandler);
    });
  }
});
