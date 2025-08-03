/**
 * BunkBot Live E2E Tests
 * 
 * SAFETY CRITICAL: These tests interact with REAL Discord servers
 * Tests will ONLY run in whitelisted test servers/channels
 * 
 * Prerequisites:
 * 1. Update e2e-test-config.json with your test server/channel IDs
 * 2. Set E2E_TEST_ENABLED=true in environment
 * 3. Ensure BunkBot is running and connected to test server
 * 4. Configure webhook URL for sending test messages
 */

import { Client, GatewayIntentBits, WebhookClient, Message, TextChannel } from 'discord.js';
import { logger } from '@starbunk/shared';
import * as fs from 'fs';
import * as path from 'path';
import { requireSafeTestEnvironment } from '../utils/e2e-safety-validator';

// Import test configuration
const testConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../e2e-test-config.json'), 'utf8')
);

interface BotTestResult {
  botName: string;
  triggerMessage: string;
  success: boolean;
  actualResponse?: string;
  expectedResponse: string;
  expectedBotName?: string;
  responseTime?: number;
  botIdentity?: {
    username: string;
    avatarUrl?: string;
  };
  identityValidation?: {
    usernameMatch: boolean;
    hasAvatar: boolean;
  };
  error?: string;
}

interface E2ETestResults {
  botTests: BotTestResult[];
  slashCommandTests: any[];
  controlTests: any[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

describe('BunkBot Live E2E Tests', () => {
  let testClient: Client;
  let webhookClient: WebhookClient;
  let testChannel: TextChannel;
  let testResults: E2ETestResults;

  // Safety check - only run if explicitly enabled
  const isE2EEnabled = process.env.E2E_TEST_ENABLED === 'true';
  const testServerId = process.env.TESTING_SERVER_IDS?.split(',')[0] || testConfig.testEnvironment.testServerId;
  const testChannelId = process.env.TESTING_CHANNEL_IDS?.split(',')[0] || testConfig.testEnvironment.testChannelIds[0];
  const webhookUrl = process.env.E2E_TEST_WEBHOOK_URL;

  beforeAll(async () => {
    if (!isE2EEnabled) {
      console.log('⚠️  Live E2E tests disabled. Set E2E_TEST_ENABLED=true to enable.');
      return;
    }

    // Critical safety validation - will throw if unsafe
    requireSafeTestEnvironment();

    // Additional validation
    await validateTestEnvironment();

    // Initialize test client for monitoring responses
    testClient = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    // Initialize webhook client for sending test messages
    if (webhookUrl) {
      webhookClient = new WebhookClient({ url: webhookUrl });
    }

    // Connect test client
    await testClient.login(process.env.BUNKBOT_TOKEN || process.env.STARBUNK_TOKEN);
    await waitForClientReady(testClient);

    // Get test channel
    testChannel = await testClient.channels.fetch(testChannelId) as TextChannel;
    if (!testChannel) {
      throw new Error(`Could not access test channel ${testChannelId}`);
    }

    logger.info(`🧪 Live E2E tests initialized for channel: ${testChannel.name}`);

    // Initialize test results
    testResults = {
      botTests: [],
      slashCommandTests: [],
      controlTests: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        duration: 0
      }
    };
  }, 30000);

  afterAll(async () => {
    if (!isE2EEnabled) return;

    // Generate test report
    generateTestReport();

    // Cleanup
    if (testClient) {
      await testClient.destroy();
    }
    if (webhookClient) {
      webhookClient.destroy();
    }
  });

  describe('Safety Validation', () => {
    it('should validate test environment configuration', async () => {
      if (!isE2EEnabled) {
        expect(true).toBe(true); // Skip test
        return;
      }

      expect(testServerId).toBeDefined();
      expect(testChannelId).toBeDefined();
      expect(testServerId).not.toBe('REPLACE_WITH_YOUR_TEST_SERVER_ID');
      expect(testChannelId).not.toBe('REPLACE_WITH_YOUR_TEST_CHANNEL_ID_1');
    });

    it('should only run in whitelisted test servers', async () => {
      if (!isE2EEnabled) {
        expect(true).toBe(true);
        return;
      }

      const whitelistedServers = process.env.TESTING_SERVER_IDS?.split(',') || [];
      expect(whitelistedServers).toContain(testServerId);
    });
  });

  describe('Reply Bot Response Tests', () => {
    // Generate test for each bot
    testConfig.botTests.forEach((botTest: any) => {
      it(`should trigger ${botTest.botName} with message "${botTest.triggerMessage}"`, async () => {
        if (!isE2EEnabled) {
          expect(true).toBe(true);
          return;
        }

        const result = await testBotResponse(botTest);
        testResults.botTests.push(result);

        expect(result.success).toBe(true);
        if (!result.success) {
          console.error(`❌ ${botTest.botName} test failed:`, result.error);
        }
      }, 15000); // 15 second timeout per bot test
    });
  });

  describe('Control Tests', () => {
    it('should not trigger any bots with control message', async () => {
      if (!isE2EEnabled) {
        expect(true).toBe(true);
        return;
      }

      const controlTest = testConfig.controlTests[0];
      const result = await testControlMessage(controlTest);
      testResults.controlTests.push(result);

      expect(result.success).toBe(true);
    }, 10000);
  });

  describe('Slash Command Tests', () => {
    testConfig.slashCommandTests.forEach((cmdTest: any) => {
      it(`should respond to /${cmdTest.command} slash command`, async () => {
        if (!isE2EEnabled) {
          expect(true).toBe(true);
          return;
        }

        // Note: Slash command testing requires more complex setup
        // For now, we'll mark as pending and implement later
        pending('Slash command testing requires additional Discord API setup');
      });
    });
  });

  // Helper functions
  async function validateTestEnvironment(): Promise<void> {
    if (!testServerId || testServerId === 'REPLACE_WITH_YOUR_TEST_SERVER_ID') {
      throw new Error('Test server ID not configured in e2e-test-config.json');
    }
    if (!testChannelId || testChannelId === 'REPLACE_WITH_YOUR_TEST_CHANNEL_ID_1') {
      throw new Error('Test channel ID not configured in e2e-test-config.json');
    }
    if (!process.env.BUNKBOT_TOKEN && !process.env.STARBUNK_TOKEN) {
      throw new Error('Discord bot token not configured');
    }
  }

  async function waitForClientReady(client: Client): Promise<void> {
    return new Promise((resolve) => {
      if (client.isReady()) {
        resolve();
      } else {
        client.once('ready', () => resolve());
      }
    });
  }

  async function testBotResponse(botTest: any): Promise<BotTestResult> {
    const startTime = Date.now();
    
    try {
      // Send test message
      const sentMessage = await sendTestMessage(botTest.triggerMessage, botTest.requiresBotMessage);
      
      // Wait for bot response
      const botResponse = await waitForBotResponse(sentMessage, botTest.expectedResponse, 10000);
      
      const responseTime = Date.now() - startTime;
      
      if (botResponse) {
        // Validate bot identity
        const expectedBotName = botTest.expectedBotName || botTest.botName;
        const usernameMatch = botResponse.author.username === expectedBotName ||
                             botResponse.author.displayName === expectedBotName;
        const hasAvatar = !!botResponse.author.avatar;

        // Check if response contains expected content
        const responseMatch = botResponse.content.toLowerCase().includes(botTest.expectedResponse.toLowerCase()) ||
                             botResponse.content === botTest.expectedResponse;

        const success = responseMatch && (usernameMatch || !botTest.expectedBotName);

        return {
          botName: botTest.botName,
          triggerMessage: botTest.triggerMessage,
          success,
          actualResponse: botResponse.content,
          expectedResponse: botTest.expectedResponse,
          expectedBotName: botTest.expectedBotName,
          responseTime,
          botIdentity: {
            username: botResponse.author.username,
            avatarUrl: botResponse.author.displayAvatarURL()
          },
          identityValidation: {
            usernameMatch,
            hasAvatar
          },
          error: success ? undefined : `Response validation failed. Expected: "${botTest.expectedResponse}", Got: "${botResponse.content}". Username expected: "${expectedBotName}", Got: "${botResponse.author.username}"`
        };
      } else {
        return {
          botName: botTest.botName,
          triggerMessage: botTest.triggerMessage,
          success: false,
          expectedResponse: botTest.expectedResponse,
          expectedBotName: botTest.expectedBotName,
          responseTime,
          error: 'No bot response received within timeout'
        };
      }
    } catch (error) {
      return {
        botName: botTest.botName,
        triggerMessage: botTest.triggerMessage,
        success: false,
        expectedResponse: botTest.expectedResponse,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function sendTestMessage(content: string, requiresBotMessage = false): Promise<Message> {
    if (webhookClient && !requiresBotMessage) {
      // Send as webhook (appears as user message)
      const webhookMessage = await webhookClient.send({
        content,
        username: 'E2E Test User',
        avatarURL: 'https://cdn.discordapp.com/embed/avatars/0.png'
      });
      
      // Fetch the actual message object
      return await testChannel.messages.fetch(webhookMessage.id);
    } else {
      // Send as bot message (for testing bot-to-bot interactions)
      return await testChannel.send(content);
    }
  }

  async function waitForBotResponse(triggerMessage: Message, expectedContent: string, timeout: number): Promise<Message | null> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        testChannel.off('messageCreate', messageHandler);
        resolve(null);
      }, timeout);

      const messageHandler = (message: Message) => {
        // Skip if it's the trigger message itself
        if (message.id === triggerMessage.id) return;
        
        // Skip if it's from the test user/webhook
        if (message.author.id === testClient.user?.id) return;
        
        // Check if message contains expected content
        if (message.content.toLowerCase().includes(expectedContent.toLowerCase())) {
          clearTimeout(timeoutId);
          testChannel.off('messageCreate', messageHandler);
          resolve(message);
        }
      };

      testChannel.on('messageCreate', messageHandler);
    });
  }

  async function testControlMessage(controlTest: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const sentMessage = await sendTestMessage(controlTest.message);
      
      // Wait for potential responses (should be none)
      const responses = await waitForAnyBotResponses(sentMessage, 5000);
      
      return {
        name: controlTest.name,
        message: controlTest.message,
        success: responses.length === controlTest.expectedBotResponses,
        actualResponses: responses.length,
        expectedResponses: controlTest.expectedBotResponses,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: controlTest.name,
        message: controlTest.message,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async function waitForAnyBotResponses(triggerMessage: Message, timeout: number): Promise<Message[]> {
    const responses: Message[] = [];
    
    return new Promise((resolve) => {
      const _timeoutId = setTimeout(() => {
        testChannel.off('messageCreate', messageHandler);
        resolve(responses);
      }, timeout);

      const messageHandler = (message: Message) => {
        // Skip if it's the trigger message itself
        if (message.id === triggerMessage.id) return;
        
        // Skip if it's from the test user/webhook
        if (message.author.id === testClient.user?.id) return;
        
        // Collect any bot responses
        if (message.author.bot) {
          responses.push(message);
        }
      };

      testChannel.on('messageCreate', messageHandler);
    });
  }

  function generateTestReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        testServerId,
        testChannelId,
        nodeEnv: process.env.NODE_ENV,
        debugMode: process.env.DEBUG_MODE
      },
      results: testResults
    };

    // Calculate summary
    const allTests = [...testResults.botTests, ...testResults.controlTests];
    report.results.summary = {
      totalTests: allTests.length,
      passed: allTests.filter(t => t.success).length,
      failed: allTests.filter(t => !t.success).length,
      duration: 0 // Will be calculated by test runner
    };

    // Write report to file
    const reportPath = path.join(__dirname, '../../e2e-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 E2E Test Report generated: ${reportPath}`);
    console.log(`✅ Passed: ${report.results.summary.passed}`);
    console.log(`❌ Failed: ${report.results.summary.failed}`);
  }
});
