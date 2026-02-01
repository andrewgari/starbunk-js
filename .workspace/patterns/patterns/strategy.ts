import type { DiscordMessageContext } from '@starbunk/shared';

/**
 * Pattern: Identity Strategy Resolver
 * Use this for bot-specific personality logic.
 */
export interface IdentityStrategy {
  resolve(context: DiscordMessageContext): Promise<string>;
}
