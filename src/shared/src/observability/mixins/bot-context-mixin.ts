import type { LogLayer, LogLayerMixin, LogLayerMixinRegistration, MockLogLayer } from 'loglayer';
import { LogLayerMixinAugmentType } from 'loglayer';

/**
 * Generic bot context for structured logging
 */
export interface BotContext {
  bot_name?: string;
  response_type?: 'success' | 'error' | 'skipped';
  [key: string]: any; // Allow additional bot-specific fields
}

/**
 * Mixin interface for generic bot context logging
 */
export interface IBotContextMixin<T> {
  /**
   * Add bot context to the log
   * @param context - Bot context object
   * @returns Logger instance for chaining
   */
  withBotContext(context: BotContext): T;
}

// Augment the loglayer module
declare module 'loglayer' {
  interface LogLayer extends IBotContextMixin<LogLayer> {}
  interface MockLogLayer extends IBotContextMixin<MockLogLayer> {}
  interface ILogLayer<This> extends IBotContextMixin<This> {}
}

/**
 * Bot context mixin implementation
 */
const botContextMixinImpl: LogLayerMixin = {
  augmentationType: LogLayerMixinAugmentType.LogLayer,

  augment: prototype => {
    prototype.withBotContext = function (this: LogLayer, context: BotContext): LogLayer {
      return this.withContext(context);
    };
  },

  augmentMock: prototype => {
    prototype.withBotContext = function (this: MockLogLayer, _context: BotContext): MockLogLayer {
      return this;
    };
  },
};

/**
 * Register the bot context mixin
 */
export function botContextMixin(): LogLayerMixinRegistration {
  return {
    mixinsToAdd: [botContextMixinImpl],
  };
}
