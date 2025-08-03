/**
 * E2E Message Processing Tests
 * 
 * Tests that E2E test messages are properly processed by bots
 * and that the identity system works correctly.
 */

import { Message } from 'discord.js';
import { BotFactory } from '../core/bot-factory';
import { DiscordService } from '@starbunk/shared';

// Mock DiscordService
const mockDiscordService = {
  sendMessageWithBotIdentity: jest.fn().mockResolvedValue({}),
  getOrCreateWebhook: jest.fn().mockResolvedValue({}),
} as unknown as DiscordService;

// Mock logger to avoid console output during tests
jest.mock('@starbunk/shared', () => ({
  ...jest.requireActual('@starbunk/shared'),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  isDebugMode: jest.fn().mockReturnValue(true), // Enable debug mode for better logging
}));

// Mock ConfigurationService
jest.mock('../services/configurationService', () => ({
  ConfigurationService: jest.fn().mockImplementation(() => ({
    getUserIdByUsername: jest.fn().mockResolvedValue('123456789'),
  })),
}));

// Create a mock Discord message
function createMockMessage(
  content: string, 
  options: {
    authorId?: string;
    authorUsername?: string;
    isBot?: boolean;
    webhookId?: string | null;
  } = {}
): Partial<Message> {
  const {
    authorId = '987654321',
    authorUsername = 'TestUser',
    isBot = false,
    webhookId = null
  } = options;

  return {
    content,
    author: {
      id: authorId,
      username: authorUsername,
      bot: isBot,
    } as any,
    channel: {
      id: '123456789',
      send: jest.fn().mockResolvedValue({}),
    } as any,
    guild: {
      id: '987654321',
    } as any,
    webhookId,
    client: {
      user: {
        id: 'different-bot-id', // Different from author ID to avoid self-message filtering
      }
    } as any,
  };
}

// Mock trigger for testing
const mockTrigger = {
  name: 'test-trigger',
  condition: jest.fn().mockResolvedValue(true), // Always trigger
  response: jest.fn().mockResolvedValue('Test response'),
  priority: 1,
  identity: {
    botName: 'TestBot',
    avatarUrl: 'https://example.com/avatar.png'
  }
};

describe('E2E Message Processing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set E2E test environment
    process.env.E2E_TEST_ENABLED = 'true';
    process.env.E2E_TEST_USER_ID = 'e2e-test-user-id';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.E2E_TEST_ENABLED;
    delete process.env.E2E_TEST_USER_ID;
  });

  describe('E2E Test Message Detection', () => {
    it('should process E2E webhook messages', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for E2E processing',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService
      });

      // Create E2E webhook message
      const mockMessage = createMockMessage('blu?', {
        authorUsername: 'E2E Test User',
        isBot: true,
        webhookId: 'webhook-123'
      }) as Message;

      // Process the message
      await bot.processMessage(mockMessage);

      // Verify the trigger was called
      expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
      expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);

      // Verify DiscordService was used for custom identity
      expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
        mockMessage.channel.id,
        mockTrigger.identity,
        'Test response'
      );
    });

    it('should process E2E test user messages', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for E2E processing',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService
      });

      // Create E2E test user message
      const mockMessage = createMockMessage('blu?', {
        authorId: 'e2e-test-user-id',
        authorUsername: 'E2E Bot',
        isBot: true
      }) as Message;

      // Process the message
      await bot.processMessage(mockMessage);

      // Verify the trigger was called
      expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
      expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);

      // Verify DiscordService was used
      expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalled();
    });

    it('should process any webhook message when E2E enabled', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for E2E processing',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService
      });

      // Create any webhook message
      const mockMessage = createMockMessage('blu?', {
        authorUsername: 'Some Webhook',
        isBot: true,
        webhookId: 'any-webhook-123'
      }) as Message;

      // Process the message
      await bot.processMessage(mockMessage);

      // Verify the trigger was called
      expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
      expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);

      // Verify DiscordService was used
      expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalled();
    });
  });

  describe('Bot Message Filtering', () => {
    it('should filter out regular bot messages when E2E disabled', async () => {
      // Disable E2E testing
      process.env.E2E_TEST_ENABLED = 'false';

      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for filtering',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService,
        skipBotMessages: true // Enable bot message filtering
      });

      // Create regular bot message (using CovaBot which should be excluded)
      const mockMessage = createMockMessage('blu?', {
        authorUsername: 'CovaBot',
        isBot: true
      }) as Message;

      // Process the message
      await bot.processMessage(mockMessage);

      // Verify the trigger was NOT called (message was filtered)
      expect(mockTrigger.condition).not.toHaveBeenCalled();
      expect(mockTrigger.response).not.toHaveBeenCalled();
      expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
    });

    it('should process regular user messages normally', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot for user messages',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService
      });

      // Create regular user message
      const mockMessage = createMockMessage('blu?', {
        authorUsername: 'RegularUser',
        isBot: false
      }) as Message;

      // Process the message
      await bot.processMessage(mockMessage);

      // Verify the trigger was called
      expect(mockTrigger.condition).toHaveBeenCalledWith(mockMessage);
      expect(mockTrigger.response).toHaveBeenCalledWith(mockMessage);
      expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalled();
    });
  });

  describe('Identity System Integration', () => {
    it('should use DiscordService for custom identity when available', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot with DiscordService',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger],
        discordService: mockDiscordService
      });

      const mockMessage = createMockMessage('blu?') as Message;
      await bot.processMessage(mockMessage);

      // Verify DiscordService was used with correct identity
      expect(mockDiscordService.sendMessageWithBotIdentity).toHaveBeenCalledWith(
        mockMessage.channel.id,
        mockTrigger.identity,
        'Test response'
      );
    });

    it('should fallback to regular channel send when no DiscordService', async () => {
      const bot = BotFactory.createBot({
        name: 'TestBot',
        description: 'Test bot without DiscordService',
        defaultIdentity: {
          botName: 'TestBot',
          avatarUrl: 'https://example.com/avatar.png'
        },
        triggers: [mockTrigger]
        // No discordService provided
      });

      const mockMessage = createMockMessage('blu?') as Message;
      await bot.processMessage(mockMessage);

      // Verify regular channel send was used
      expect(mockMessage.channel.send).toHaveBeenCalledWith('Test response');
      expect(mockDiscordService.sendMessageWithBotIdentity).not.toHaveBeenCalled();
    });
  });
});
