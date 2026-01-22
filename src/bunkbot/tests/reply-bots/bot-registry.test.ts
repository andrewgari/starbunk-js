import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BotRegistry } from '@/reply-bots/bot-registry';
import { ReplyBot } from '@/reply-bots/models/reply-bot';
import { Message } from 'discord.js';

// Mock the logger and metrics
vi.mock('@starbunk/shared/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@starbunk/shared/observability/metrics-service', () => ({
  getMetricsService: () => ({
    trackMessageProcessed: vi.fn(),
    trackBotError: vi.fn(),
  }),
}));

// Helper to create a mock bot
function createMockBot(
  name: string,
  ignoreBots: boolean = true,
  ignoreHumans: boolean = false
): ReplyBot {
  return {
    name,
    ignore_bots: ignoreBots,
    ignore_humans: ignoreHumans,
    handleMessage: vi.fn(),
  } as any;
}

// Helper to create a mock message
function createMockMessage(isBot: boolean = false): Partial<Message> {
  return {
    id: 'msg-123',
    content: 'Test message',
    channelId: 'channel-123',
    guildId: 'guild-123',
    author: {
      id: 'user-123',
      username: 'TestUser',
      bot: isBot,
    } as any,
    mentions: {
      users: new Map(),
      roles: new Map(),
    } as any,
    attachments: new Map(),
    embeds: [],
    stickers: new Map(),
    reference: null,
    createdAt: new Date(),
  } as Partial<Message>;
}

describe('BotRegistry', () => {
  let registry: BotRegistry;

  beforeEach(() => {
    registry = new BotRegistry();
  });

  describe('register', () => {
    it('should register a new bot', () => {
      const bot = createMockBot('test-bot');

      registry.register(bot);

      expect(registry.getBots()).toHaveLength(1);
      expect(registry.getBots()[0].name).toBe('test-bot');
    });

    it('should not register duplicate bots', () => {
      const bot1 = createMockBot('test-bot');
      const bot2 = createMockBot('test-bot');

      registry.register(bot1);
      registry.register(bot2);

      // Should only have one bot
      expect(registry.getBots()).toHaveLength(1);
    });

    it('should register multiple different bots', () => {
      const bot1 = createMockBot('bot-one');
      const bot2 = createMockBot('bot-two');
      const bot3 = createMockBot('bot-three');

      registry.register(bot1);
      registry.register(bot2);
      registry.register(bot3);

      expect(registry.getBots()).toHaveLength(3);
    });
  });

  describe('getBots', () => {
    it('should return empty array when no bots registered', () => {
      expect(registry.getBots()).toEqual([]);
    });

    it('should return all registered bots', () => {
      const bot1 = createMockBot('bot-one');
      const bot2 = createMockBot('bot-two');

      registry.register(bot1);
      registry.register(bot2);

      const bots = registry.getBots();
      expect(bots).toHaveLength(2);
      expect(bots.map(b => b.name)).toEqual(['bot-one', 'bot-two']);
    });
  });

  describe('processMessage', () => {
    it('should process message with all bots', async () => {
      const bot1 = createMockBot('bot-one');
      const bot2 = createMockBot('bot-two');

      registry.register(bot1);
      registry.register(bot2);

      const message = createMockMessage(false);
      await registry.processMessage(message as Message);

      expect(bot1.handleMessage).toHaveBeenCalledWith(message);
      expect(bot2.handleMessage).toHaveBeenCalledWith(message);
    });

    it('should skip bot messages when ignore_bots is true', async () => {
      const bot = createMockBot('test-bot', true, false);
      registry.register(bot);

      const botMessage = createMockMessage(true);
      await registry.processMessage(botMessage as Message);

      expect(bot.handleMessage).not.toHaveBeenCalled();
    });

    it('should process bot messages when ignore_bots is false', async () => {
      const bot = createMockBot('test-bot', false, false);
      registry.register(bot);

      const botMessage = createMockMessage(true);
      await registry.processMessage(botMessage as Message);

      expect(bot.handleMessage).toHaveBeenCalledWith(botMessage);
    });

    it('should skip human messages when ignore_humans is true', async () => {
      const bot = createMockBot('test-bot', false, true);
      registry.register(bot);

      const humanMessage = createMockMessage(false);
      await registry.processMessage(humanMessage as Message);

      expect(bot.handleMessage).not.toHaveBeenCalled();
    });

    it('should process human messages when ignore_humans is false', async () => {
      const bot = createMockBot('test-bot', true, false);
      registry.register(bot);

      const humanMessage = createMockMessage(false);
      await registry.processMessage(humanMessage as Message);

      expect(bot.handleMessage).toHaveBeenCalledWith(humanMessage);
    });

    it('should handle errors from individual bots gracefully', async () => {
      const bot1 = createMockBot('bot-one');
      const bot2 = createMockBot('bot-two');

      // Make bot1 throw an error
      vi.mocked(bot1.handleMessage).mockRejectedValue(new Error('Bot error'));

      registry.register(bot1);
      registry.register(bot2);

      const message = createMockMessage(false);

      // Should not throw
      await expect(registry.processMessage(message as Message)).resolves.not.toThrow();

      // Bot2 should still be called
      expect(bot2.handleMessage).toHaveBeenCalled();
    });
  });
});

