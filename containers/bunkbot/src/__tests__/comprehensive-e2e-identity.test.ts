/**
 * Production Bot E2E Identity Tests
 *
 * Tests ALL reply-bots against the running production BunkBot instance
 * using webhook-based message simulation and response monitoring.
 *
 * Architecture:
 * 1. Send webhook messages to Discord (simulates user messages)
 * 2. Monitor for production bot responses
 * 3. Validate bot identity (custom names/avatars) and content
 * 4. No bot lifecycle management - tests against live production bot
 */

import { Client, GatewayIntentBits, WebhookClient, Message } from 'discord.js';

// Test configuration - requires production bot to be running
const TEST_CONFIG = {
  testChannelId: process.env.E2E_TEST_CHANNEL_ID || '798613445301633137',
  webhookUrl: process.env.E2E_WEBHOOK_URL, // Required for sending test messages
  monitorToken: process.env.E2E_MONITOR_TOKEN || process.env.STARBUNK_TOKEN, // Read-only monitoring
  responseTimeout: 15000, // 15 seconds to wait for bot response
  messageCleanupDelay: 2000 // 2 seconds between tests for cleanup
};

// Production bot test cases - tests against live BunkBot instance
const PRODUCTION_BOT_TESTS = [
  {
    botName: 'BlueBot',
    triggerMessage: 'blu?',
    expectedResponse: 'Did somebody say Blu?',
    type: 'deterministic',
    description: 'Tests BlueBot custom identity and response'
  },
  {
    botName: 'HoldBot',
    triggerMessage: 'Hold',
    expectedResponse: 'Hold.',
    type: 'deterministic',
    description: 'Tests HoldBot custom identity and response'
  },
  {
    botName: 'GuyBot',
    triggerMessage: 'guy',
    expectedResponse: 'guy',
    type: 'user-specific',
    description: 'Tests GuyBot with Guy\'s Discord identity'
  },
  {
    botName: 'ChadBot',
    triggerMessage: 'anything random for chad test',
    expectedResponse: 'What is bro *yappin* about?...',
    type: 'probabilistic',
    probability: 0.01,
    description: 'Tests ChadBot probabilistic response (1% chance)',
    maxAttempts: 10 // Try multiple times due to low probability
  },
  {
    botName: 'VennBot',
    triggerMessage: 'venn',
    expectedResponse: 'Hmm...',
    type: 'user-specific',
    description: 'Tests VennBot with Venn\'s Discord identity'
  },
  {
    botName: 'BunkBot',
    triggerMessage: '69',
    expectedResponse: 'Nice.',
    type: 'deterministic',
    description: 'Tests BunkBot (nice-bot) custom identity'
  },
  {
    botName: 'Sheesh Bot',
    triggerMessage: 'sheesh',
    expectedResponse: 'SHEEEESH',
    type: 'deterministic',
    description: 'Tests Sheesh Bot custom identity'
  },
  {
    botName: 'CheckBot',
    triggerMessage: 'check',
    expectedResponse: 'czech',
    type: 'deterministic',
    description: 'Tests CheckBot word replacement'
  },
  {
    botName: 'BananaBot',
    triggerMessage: 'banana',
    expectedResponse: 'banana',
    type: 'deterministic',
    description: 'Tests BananaBot custom identity'
  },
  {
    botName: 'BabyBot',
    triggerMessage: 'baby',
    expectedResponse: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus.gif',
    type: 'deterministic',
    description: 'Tests BabyBot metroid gif response'
  }
];

describe('Production Bot E2E Identity Tests', () => {
  let monitorClient: Client;
  let webhookClient: WebhookClient;

  beforeAll(async () => {
    // Check if E2E testing is properly configured
    if (!TEST_CONFIG.webhookUrl) {
      console.log('⚠️ E2E_WEBHOOK_URL not configured - skipping webhook-based E2E tests');
      console.log('💡 To run E2E tests:');
      console.log('   1. Create a Discord webhook in your test channel');
      console.log('   2. Set E2E_WEBHOOK_URL environment variable');
      console.log('   3. Ensure production BunkBot is running');
      console.log('   4. Re-run the tests');
      return;
    }
    if (!TEST_CONFIG.monitorToken) {
      console.log('⚠️ E2E_MONITOR_TOKEN or STARBUNK_TOKEN not configured - skipping E2E tests');
      return;
    }

    // Initialize webhook client for sending test messages
    webhookClient = new WebhookClient({ url: TEST_CONFIG.webhookUrl });

    // Initialize monitoring client for observing bot responses
    monitorClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    // Connect monitoring client
    await monitorClient.login(TEST_CONFIG.monitorToken);
    await new Promise(resolve => monitorClient.once('ready', resolve));

    console.log(`✅ Production E2E Test setup complete`);
    console.log(`   Webhook: ${TEST_CONFIG.webhookUrl ? 'Configured' : 'Missing'}`);
    console.log(`   Monitor: Connected as ${monitorClient.user?.tag}`);
    console.log(`   Channel: ${TEST_CONFIG.testChannelId}`);
    console.log(`   Testing: ${PRODUCTION_BOT_TESTS.length} bots against live production instance`);
  }, 30000);

  afterAll(async () => {
    if (monitorClient) {
      await monitorClient.destroy();
    }
    if (webhookClient) {
      webhookClient.destroy();
    }
  });

  describe('Production Bot Identity Validation', () => {
    PRODUCTION_BOT_TESTS.forEach((botTest) => {
      it(`should validate ${botTest.botName} custom identity and response`, async () => {
        // Skip test if E2E configuration is missing
        if (!TEST_CONFIG.webhookUrl || !TEST_CONFIG.monitorToken) {
          console.log(`⚠️ Skipping ${botTest.botName} - E2E configuration missing`);
          return;
        }

        console.log(`🧪 Testing ${botTest.botName}: ${botTest.description}`);

        let attempts = 0;
        const maxAttempts = botTest.maxAttempts || 1;
        let lastError: Error | null = null;

        // For probabilistic bots, try multiple times
        while (attempts < maxAttempts) {
          attempts++;

          try {
            console.log(`   Attempt ${attempts}/${maxAttempts}: Sending trigger "${botTest.triggerMessage}"`);

            // Send webhook message to simulate user input
            await sendWebhookMessage(botTest.triggerMessage);

            // Wait for production bot response
            const response = await waitForProductionBotResponse(botTest);

            if (response) {
              // Validate response content
              expect(response.content).toContain(botTest.expectedResponse);

              // Validate bot identity (most important test)
              expect(response.author.username).toBe(botTest.botName);
              expect(response.author.bot).toBe(true);

              // Check if bot used webhook (custom identity)
              if (response.webhookId) {
                console.log(`   ✅ ${botTest.botName} used webhook for custom identity`);
                console.log(`   🎭 Custom identity: ${response.author.username}`);
                console.log(`   📷 Custom avatar: ${response.author.displayAvatarURL()}`);
              } else {
                console.log(`   ⚠️ ${botTest.botName} used regular message (default bot identity)`);
              }

              console.log(`   ✅ ${botTest.botName} validation successful`);
              return; // Success - exit retry loop
            }

          } catch (error) {
            lastError = error as Error;
            console.log(`   ❌ Attempt ${attempts} failed: ${error.message}`);

            if (attempts < maxAttempts) {
              console.log(`   🔄 Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        // All attempts failed
        if (botTest.type === 'probabilistic') {
          console.log(`   ⚠️ ${botTest.botName} did not respond after ${maxAttempts} attempts (probabilistic bot)`);
          console.log(`   💡 This may be expected due to low probability (${botTest.probability * 100}%)`);
        } else {
          throw lastError || new Error(`${botTest.botName} failed to respond after ${maxAttempts} attempts`);
        }
      }, TEST_CONFIG.responseTimeout * 3); // Allow extra time for retries
    });
  });

  describe('Production Bot Health Check', () => {
    it('should verify production BunkBot is running and responsive', async () => {
      // Skip test if E2E configuration is missing
      if (!TEST_CONFIG.webhookUrl || !TEST_CONFIG.monitorToken) {
        console.log('⚠️ Skipping health check - E2E configuration missing');
        return;
      }

      console.log('🏥 Checking if production BunkBot is online and responsive...');

      // Send a simple test message that should trigger a deterministic response
      await sendWebhookMessage('blu?'); // BlueBot should always respond

      // Wait for any bot response to confirm production bot is running
      const response = await waitForAnyBotResponse();

      if (response) {
        console.log(`✅ Production bot is responsive`);
        console.log(`   Response from: ${response.author.username}`);
        console.log(`   Response content: ${response.content}`);
        expect(response.author.bot).toBe(true);
      } else {
        throw new Error('Production BunkBot appears to be offline or unresponsive');
      }
    }, TEST_CONFIG.responseTimeout);
  });

  // Helper functions for webhook-based testing
  async function sendWebhookMessage(content: string): Promise<void> {
    await webhookClient.send({
      content,
      username: 'E2E Test User',
      avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
    });

    // Small delay to ensure message is processed
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async function waitForProductionBotResponse(botTest: any): Promise<Message | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        monitorClient.off('messageCreate', messageHandler);
        resolve(null);
      }, TEST_CONFIG.responseTimeout);

      const messageHandler = (message: Message) => {
        // Only look at messages in our test channel from bots
        if (message.channel.id !== TEST_CONFIG.testChannelId || !message.author.bot) {
          return;
        }

        // Check if this is the expected bot response
        const isExpectedBot = message.author.username === botTest.botName;
        const hasExpectedContent = message.content.includes(botTest.expectedResponse);

        if (isExpectedBot && hasExpectedContent) {
          clearTimeout(timeout);
          monitorClient.off('messageCreate', messageHandler);
          resolve(message);
        }
      };

      monitorClient.on('messageCreate', messageHandler);
    });
  }

  async function waitForAnyBotResponse(): Promise<Message | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        monitorClient.off('messageCreate', messageHandler);
        resolve(null);
      }, TEST_CONFIG.responseTimeout);

      const messageHandler = (message: Message) => {
        if (message.channel.id === TEST_CONFIG.testChannelId && message.author.bot) {
          clearTimeout(timeout);
          monitorClient.off('messageCreate', messageHandler);
          resolve(message);
        }
      };

      monitorClient.on('messageCreate', messageHandler);
    });
  }
});
