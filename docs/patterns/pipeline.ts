/**
 * Pattern: Middleware Pipeline
 * Use this for processing Discord events in sequence.
 */

/**
 * Application-specific context for a single Discord event.
 * Replace or extend this interface with the properties your bot needs
 * (for example: client, message, interaction, or request metadata).
 */
export interface Context {
	// Example placeholder property:
	// client: DiscordClient;
}

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;
