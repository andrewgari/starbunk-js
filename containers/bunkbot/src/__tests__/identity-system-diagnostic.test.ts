/**
 * Identity System Diagnostic Tests
 * 
 * Comprehensive diagnostic tests to identify why the webhook-based identity system
 * isn't working in the live E2E test environment.
 */

import { Client, TextChannel } from 'discord.js';
import { DiscordService } from '@starbunk/shared';
import { BotIdentity } from '../types/botIdentity';

// Mock logger to capture debug output
jest.mock('@starbunk/shared', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return {
    ...jest.requireActual('@starbunk/shared'),
    logger: mockLogger,
  };
});

describe('Identity System Diagnostics', () => {
  let mockClient: Client;
  let mockChannel: TextChannel;
  let discordService: DiscordService;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked logger
    mockLogger = require('@starbunk/shared').logger;
    
    // Create mock Discord client
    mockClient = {
      user: {
        id: 'test-bot-id',
        displayAvatarURL: jest.fn().mockReturnValue('https://example.com/bot-avatar.png')
      },
      options: {
        intents: {
          has: jest.fn().mockReturnValue(true) // Mock intents check
        }
      }
    } as any;

    // Create mock text channel
    mockChannel = {
      id: 'test-channel-id',
      name: 'test-channel',
      fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
      createWebhook: jest.fn().mockResolvedValue({
        id: 'webhook-id',
        send: jest.fn().mockResolvedValue({})
      })
    } as any;

    discordService = new DiscordService(mockClient);
  });

  describe('Bot Identity Validation', () => {
    it('should validate complete bot identity', async () => {
      const validIdentity: BotIdentity = {
        botName: 'BlueBot',
        avatarUrl: 'https://example.com/blue-avatar.png'
      };

      // Mock the internal methods
      (discordService as any).getTextChannel = jest.fn().mockReturnValue(mockChannel);
      (discordService as any).getOrCreateWebhook = jest.fn().mockResolvedValue({
        send: jest.fn().mockResolvedValue({})
      });

      // Mock message filter to allow all channels
      jest.doMock('./messageFilter', () => ({
        getMessageFilter: () => ({
          isDebugMode: () => false,
          getTestingChannelIds: () => []
        })
      }));

      await discordService.sendMessageWithBotIdentity('test-channel-id', validIdentity, 'Test message');

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Sending webhook message with identity: BlueBot')
      );
    });

    it('should reject invalid bot identity - missing botName', async () => {
      const invalidIdentity: BotIdentity = {
        botName: '',
        avatarUrl: 'https://example.com/avatar.png'
      };

      await discordService.sendMessageWithBotIdentity('test-channel-id', invalidIdentity, 'Test message');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid bot identity provided')
      );
    });

    it('should reject invalid bot identity - missing avatarUrl', async () => {
      const invalidIdentity: BotIdentity = {
        botName: 'TestBot',
        avatarUrl: ''
      };

      await discordService.sendMessageWithBotIdentity('test-channel-id', invalidIdentity, 'Test message');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid bot identity provided')
      );
    });
  });

  describe('Debug Mode Channel Filtering', () => {
    it('should block messages when debug mode is enabled and channel not whitelisted', async () => {
      const validIdentity: BotIdentity = {
        botName: 'TestBot',
        avatarUrl: 'https://example.com/avatar.png'
      };

      // Mock message filter to simulate debug mode with whitelist
      jest.doMock('./messageFilter', () => ({
        getMessageFilter: () => ({
          isDebugMode: () => true,
          getTestingChannelIds: () => ['whitelisted-channel-id'] // Different from test channel
        })
      }));

      await discordService.sendMessageWithBotIdentity('test-channel-id', validIdentity, 'Test message');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG MODE: Blocking message to channel test-channel-id')
      );
    });

    it('should allow messages when debug mode is enabled and channel is whitelisted', async () => {
      const validIdentity: BotIdentity = {
        botName: 'TestBot',
        avatarUrl: 'https://example.com/avatar.png'
      };

      // Mock the internal methods
      (discordService as any).getTextChannel = jest.fn().mockReturnValue(mockChannel);
      (discordService as any).getOrCreateWebhook = jest.fn().mockResolvedValue({
        send: jest.fn().mockResolvedValue({})
      });

      // Mock message filter to simulate debug mode with channel whitelisted
      jest.doMock('./messageFilter', () => ({
        getMessageFilter: () => ({
          isDebugMode: () => true,
          getTestingChannelIds: () => ['test-channel-id'] // Same as test channel
        })
      }));

      await discordService.sendMessageWithBotIdentity('test-channel-id', validIdentity, 'Test message');

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('DEBUG MODE: Blocking message')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Sending webhook message with identity: TestBot')
      );
    });
  });

  describe('Webhook Creation and Permissions', () => {
    it('should handle webhook creation failure gracefully', async () => {
      const validIdentity: BotIdentity = {
        botName: 'TestBot',
        avatarUrl: 'https://example.com/avatar.png'
      };

      // Mock channel that fails webhook creation
      const failingChannel = {
        ...mockChannel,
        fetchWebhooks: jest.fn().mockResolvedValue(new Map()),
        createWebhook: jest.fn().mockRejectedValue(new Error('Missing Permissions'))
      };

      (discordService as any).getTextChannel = jest.fn().mockReturnValue(failingChannel);

      // Mock message filter to allow all channels
      jest.doMock('./messageFilter', () => ({
        getMessageFilter: () => ({
          isDebugMode: () => false,
          getTestingChannelIds: () => []
        })
      }));

      await expect(
        discordService.sendMessageWithBotIdentity('test-channel-id', validIdentity, 'Test message')
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error in getOrCreateWebhook: Missing Permissions')
      );
    });

    it('should reuse existing webhook when available', async () => {
      const validIdentity: BotIdentity = {
        botName: 'TestBot',
        avatarUrl: 'https://example.com/avatar.png'
      };

      const existingWebhook = {
        id: 'existing-webhook-id',
        owner: { id: 'test-bot-id' },
        send: jest.fn().mockResolvedValue({})
      };

      // Mock channel with existing webhook
      const channelWithWebhook = {
        ...mockChannel,
        fetchWebhooks: jest.fn().mockResolvedValue(new Map([['webhook-id', existingWebhook]])),
        createWebhook: jest.fn() // Should not be called
      };

      (discordService as any).getTextChannel = jest.fn().mockReturnValue(channelWithWebhook);

      // Mock message filter to allow all channels
      jest.doMock('./messageFilter', () => ({
        getMessageFilter: () => ({
          isDebugMode: () => false,
          getTestingChannelIds: () => []
        })
      }));

      await discordService.sendMessageWithBotIdentity('test-channel-id', validIdentity, 'Test message');

      expect(channelWithWebhook.createWebhook).not.toHaveBeenCalled();
      expect(existingWebhook.send).toHaveBeenCalledWith({
        content: 'Test message',
        username: 'TestBot',
        avatarURL: 'https://example.com/avatar.png'
      });
    });
  });

  describe('Environment Configuration Diagnostics', () => {
    it('should log environment configuration for debugging', () => {
      const envConfig = {
        E2E_TEST_ENABLED: process.env.E2E_TEST_ENABLED,
        DEBUG_MODE: process.env.DEBUG_MODE,
        TESTING_CHANNEL_IDS: process.env.TESTING_CHANNEL_IDS,
        TESTING_SERVER_IDS: process.env.TESTING_SERVER_IDS,
        E2E_BOT_TOKEN: process.env.E2E_BOT_TOKEN ? 'SET' : 'NOT SET',
        COVABOT_TOKEN: process.env.COVABOT_TOKEN ? 'SET' : 'NOT SET',
        BUNKBOT_TOKEN: process.env.BUNKBOT_TOKEN ? 'SET' : 'NOT SET',
        STARBUNK_TOKEN: process.env.STARBUNK_TOKEN ? 'SET' : 'NOT SET'
      };

      console.log('🔍 Environment Configuration for Identity System:');
      console.log(JSON.stringify(envConfig, null, 2));

      // This test always passes - it's just for logging
      expect(true).toBe(true);
    });
  });
});
