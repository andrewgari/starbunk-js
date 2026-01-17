import { LogLayer, useLogLayerMixin } from 'loglayer';
import { PinoTransport } from '@loglayer/transport-pino';
import pino from 'pino';
import { discordContextMixin, performanceMixin, botContextMixin } from '../index';

describe('LogLayer Mixins', () => {
  let logLayer: LogLayer;

  beforeAll(() => {
    // Register mixins before creating LogLayer instances
    useLogLayerMixin([
      discordContextMixin(),
      performanceMixin(),
      botContextMixin(),
    ]);
  });

  beforeEach(() => {
    // Create a new LogLayer instance for each test
    logLayer = new LogLayer({
      transport: new PinoTransport({
        logger: pino({ level: 'silent' }), // Silent for tests
      }),
    });
  });

  describe('Discord Context Mixin', () => {
    it('should add withDiscordContext method', () => {
      expect(typeof logLayer.withDiscordContext).toBe('function');
    });

    it('should add withDiscordMessage method', () => {
      expect(typeof logLayer.withDiscordMessage).toBe('function');
    });

    it('should allow chaining withDiscordContext', () => {
      const result = logLayer.withDiscordContext({
        message_id: '123',
        guild_id: '456',
        channel_id: '789',
        user_id: '000',
      });

      expect(result).toBeInstanceOf(LogLayer);
    });
  });

  describe('Performance Mixin', () => {
    it('should add startTiming method', () => {
      expect(typeof logLayer.startTiming).toBe('function');
    });

    it('should add endTiming method', () => {
      expect(typeof logLayer.endTiming).toBe('function');
    });

    it('should add withDuration method', () => {
      expect(typeof logLayer.withDuration).toBe('function');
    });

    it('should allow chaining timing methods', () => {
      const result1 = logLayer.startTiming('test_operation');
      expect(result1).toBeInstanceOf(LogLayer);

      const result2 = logLayer.endTiming('test_operation');
      expect(result2).toBeInstanceOf(LogLayer);
    });

    it('should allow withDuration chaining', () => {
      const result = logLayer.withDuration('test_operation', 100);
      expect(result).toBeInstanceOf(LogLayer);
    });
  });

  describe('Bot Context Mixin', () => {
    it('should add withBotContext method', () => {
      expect(typeof logLayer.withBotContext).toBe('function');
    });

    it('should allow chaining bot context methods', () => {
      const result = logLayer.withBotContext({
        bot_name: 'TestBot',
        response_type: 'success',
      });
      expect(result).toBeInstanceOf(LogLayer);
    });
  });

  describe('Mixin Composition', () => {
    it('should allow chaining all mixins together', () => {
      const result = logLayer
        .withDiscordContext({
          message_id: '123',
          guild_id: '456',
        })
        .withBotContext({
          bot_name: 'TestBot',
          response_type: 'success',
        })
        .startTiming('test_operation');

      expect(result).toBeInstanceOf(LogLayer);
    });
  });
});

