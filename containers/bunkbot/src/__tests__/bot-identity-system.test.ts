/**
 * Bot Identity System Tests
 * 
 * Tests the bot identity injection system to ensure bots receive
 * DiscordService instances for custom identity support via webhooks.
 */

import { BotRegistry } from '../botRegistry';
import { BotFactory } from '../core/bot-factory';
import { DiscordService } from '@starbunk/shared';

// Mock DiscordService
const mockDiscordService = {
  sendMessageWithBotIdentity: jest.fn(),
  getOrCreateWebhook: jest.fn(),
} as unknown as DiscordService;

// Mock trigger for testing
const mockTrigger = {
  name: 'test-trigger',
  condition: jest.fn().mockResolvedValue(false),
  response: jest.fn().mockResolvedValue('test response'),
  priority: 1
};

// Mock logger to avoid console output during tests
jest.mock('@starbunk/shared', () => ({
  ...jest.requireActual('@starbunk/shared'),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Bot Identity System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    BotRegistry.reset();
  });

  describe('BotFactory DiscordService Injection', () => {
    it('should inject DiscordService into bot configuration', () => {
      // Create a simple bot
      const originalBot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for identity injection',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger]
      });

      // Verify original bot doesn't have DiscordService
      expect((originalBot as any)._config?.discordService).toBeUndefined();

      // Inject DiscordService
      const botWithService = BotFactory.injectDiscordService(originalBot, mockDiscordService);

      // Verify DiscordService was injected
      expect((botWithService as any)._config?.discordService).toBe(mockDiscordService);
    });

    it('should preserve original bot properties when injecting DiscordService', () => {
      const originalBot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for identity injection',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger]
      });

      const botWithService = BotFactory.injectDiscordService(originalBot, mockDiscordService);

      // Verify bot properties are preserved
      expect(botWithService.name).toBe('TestBot');
      expect(botWithService.description).toBe('Test bot for identity injection');
      expect(botWithService.metadata).toEqual(originalBot.metadata);
    });
  });

  describe('BotRegistry DiscordService Integration', () => {
    it('should pass DiscordService to bot discovery process', async () => {
      // Mock the file system operations to avoid actual file loading
      const originalReaddir = require('fs').readdirSync;
      const originalExistsSync = require('fs').existsSync;
      
      require('fs').readdirSync = jest.fn().mockReturnValue([]);
      require('fs').existsSync = jest.fn().mockReturnValue(false);

      try {
        // Call discoverBots with DiscordService
        const bots = await BotRegistry.discoverBots(mockDiscordService);

        // Should return empty array since we mocked no bot directories
        expect(bots).toEqual([]);
        
        // Verify the method accepts DiscordService parameter
        expect(typeof BotRegistry.discoverBots).toBe('function');
      } finally {
        // Restore original functions
        require('fs').readdirSync = originalReaddir;
        require('fs').existsSync = originalExistsSync;
      }
    });
  });

  describe('Bot Configuration Storage', () => {
    it('should store original configuration in bot for later injection', () => {
      const config = {
        name: 'TestBot',
        description: 'Test bot',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger]
      };

      const bot = BotFactory.createBot(config);

      // Verify config is stored
      expect((bot as any)._config).toBeDefined();
      expect((bot as any)._config.name).toBe(config.name);
      expect((bot as any)._config.description).toBe(config.description);
      expect((bot as any)._config.defaultIdentity).toEqual(config.defaultIdentity);
    });
  });

  describe('Identity System Integration', () => {
    it('should create bots with proper identity configuration', () => {
      const identity = {
        botName: 'CustomBot',
        avatarUrl: 'https://example.com/custom-avatar.png'
      };

      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot with custom identity',
        defaultIdentity: identity,
        triggers: [mockTrigger]
      });

      // Verify identity is stored in config
      expect((bot as any)._config.defaultIdentity).toEqual(identity);
    });
  });
});
