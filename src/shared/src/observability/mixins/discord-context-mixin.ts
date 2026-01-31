import type { LogLayer, LogLayerMixin, LogLayerMixinRegistration, MockLogLayer } from 'loglayer';
import { LogLayerMixinAugmentType } from 'loglayer';
import type { Message } from 'discord.js';

/**
 * Discord message context for structured logging
 */
export interface DiscordMessageContext {
  message_id?: string;
  guild_id?: string;
  channel_id?: string;
  user_id?: string;
  username?: string;
  content_length?: number;
  has_attachments?: boolean;
  has_embeds?: boolean;
}

/**
 * Mixin interface for Discord context logging
 */
export interface IDiscordContextMixin<T> {
  /**
   * Add Discord message context to the log
   * @param message - Discord message object
   * @returns Logger instance for chaining
   */
  withDiscordMessage(message: Message): T;

  /**
   * Add Discord context from individual fields
   * @param context - Discord context object
   * @returns Logger instance for chaining
   */
  withDiscordContext(context: DiscordMessageContext): T;
}

// Augment the loglayer module
declare module 'loglayer' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface LogLayer extends IDiscordContextMixin<LogLayer> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MockLogLayer extends IDiscordContextMixin<MockLogLayer> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ILogLayer<This> extends IDiscordContextMixin<This> {}
}

/**
 * Extract Discord message context for logging
 */
function extractMessageContext(message: Message): DiscordMessageContext {
  return {
    message_id: message.id,
    guild_id: message.guildId || undefined,
    channel_id: message.channelId,
    user_id: message.author?.id,
    username: message.author?.username,
    content_length: message.content?.length ?? 0,
    has_attachments: message.attachments?.size > 0,
    has_embeds: message.embeds?.length > 0,
  };
}

/**
 * Discord context mixin implementation
 */
const discordContextMixinImpl: LogLayerMixin = {
  augmentationType: LogLayerMixinAugmentType.LogLayer,

  augment: prototype => {
    prototype.withDiscordMessage = function (this: LogLayer, message: Message): LogLayer {
      const context = extractMessageContext(message);
      return this.withContext(context);
    };

    prototype.withDiscordContext = function (
      this: LogLayer,
      context: DiscordMessageContext,
    ): LogLayer {
      return this.withContext(context);
    };
  },

  augmentMock: prototype => {
    prototype.withDiscordMessage = function (this: MockLogLayer, _message: Message): MockLogLayer {
      return this;
    };

    prototype.withDiscordContext = function (
      this: MockLogLayer,
      _context: DiscordMessageContext,
    ): MockLogLayer {
      return this;
    };
  },
};

/**
 * Register the Discord context mixin
 */
export function discordContextMixin(): LogLayerMixinRegistration {
  return {
    mixinsToAdd: [discordContextMixinImpl],
  };
}
