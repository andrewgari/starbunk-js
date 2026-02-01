/**
 * LogLayer mixins for structured logging across all Starbunk bots
 *
 * These mixins provide reusable logging patterns that can be composed together.
 * Register them before creating LogLayer instances using useLogLayerMixin().
 *
 * @example
 * ```typescript
 * import { useLogLayerMixin } from 'loglayer';
 * import { discordContextMixin, performanceMixin, botContextMixin } from '@starbunk/shared/observability/mixins';
 *
 * // Register all mixins
 * useLogLayerMixin([
 *   discordContextMixin(),
 *   performanceMixin(),
 *   botContextMixin(),
 * ]);
 *
 * // Now use them in your logger
 * logger
 *   .withDiscordMessage(message)
 *   .startTiming('message_processing')
 *   .withStrategy('BlueReplyStrategy')
 *   .info('Processing message');
 *
 * // Later...
 * logger
 *   .endTiming('message_processing')
 *   .info('Message processed');
 * ```
 */

export { discordContextMixin } from './discord-context-mixin';
export type { DiscordMessageContext, IDiscordContextMixin } from './discord-context-mixin';

export { performanceMixin } from './performance-mixin';
export type { PerformanceContext, IPerformanceMixin } from './performance-mixin';

export { botContextMixin } from './bot-context-mixin';
export type { BotContext, IBotContextMixin } from './bot-context-mixin';

/**
 * Convenience function to register all Starbunk logging mixins at once
 */
export function registerStarbunkMixins() {
  const { useLogLayerMixin } = require('loglayer');
  const { discordContextMixin: dcm } = require('./discord-context-mixin');
  const { performanceMixin: pm } = require('./performance-mixin');
  const { botContextMixin: bcm } = require('./bot-context-mixin');

  useLogLayerMixin([dcm(), pm(), bcm()]);
}
