/**
 * Setup logging mixins for DJCova
 *
 * This file registers all the shared logging mixins for DJCova.
 * It should be imported and called before creating any LogLayer instances.
 */

import { useLogLayerMixin, type LogLayerMixinRegistration } from 'loglayer';
import {
  discordContextMixin,
  performanceMixin,
  botContextMixin,
} from '@starbunk/shared/observability/mixins';

/**
 * Register all logging mixins for DJCova
 * Must be called before creating any logger instances
 */
export function setupDJCovaLogging() {
  // Register shared mixins
  // Type assertion needed due to TypeScript module identity issue in monorepo
  useLogLayerMixin([
    // Shared mixins (available to all bots)
    discordContextMixin() as unknown as LogLayerMixinRegistration,
    performanceMixin() as unknown as LogLayerMixinRegistration,
    botContextMixin() as unknown as LogLayerMixinRegistration,
  ]);
}
