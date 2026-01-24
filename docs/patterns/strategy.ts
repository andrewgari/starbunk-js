import { MessageContext } from '@/observability/mixins/discord-context-mixin';

/**
 * Pattern: Identity Strategy Resolver
 * Use this for bot-specific personality logic.
 */
export interface IdentityStrategy {
  resolve(context: MessageContext): Promise<Response>;
}
