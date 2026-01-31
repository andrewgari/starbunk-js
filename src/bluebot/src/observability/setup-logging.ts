/**
 * Setup logging mixins for BlueBot
 *
 * This file registers all the shared logging mixins and any BlueBot-specific
 * logging configuration. It should be imported and called before creating
 * any LogLayer instances.
 */

import { useLogLayerMixin, type LogLayerMixinRegistration } from 'loglayer';
import {
  discordContextMixin,
  performanceMixin,
  botContextMixin,
} from '@starbunk/shared/observability/mixins';
import { strategyMixin } from '@/observability/mixins';

/**
 * Register all logging mixins for BlueBot
 * Must be called before creating any logger instances
 */
export function setupBlueBotLogging() {
  // Register shared mixins + BlueBot-specific mixins
  // Type assertion needed due to TypeScript module identity issue in monorepo
  useLogLayerMixin([
    // Shared mixins (available to all bots)
    discordContextMixin() as unknown as LogLayerMixinRegistration,
    performanceMixin() as unknown as LogLayerMixinRegistration,
    botContextMixin() as unknown as LogLayerMixinRegistration,

    // BlueBot-specific mixins
    strategyMixin() as unknown as LogLayerMixinRegistration,
  ]);
}
