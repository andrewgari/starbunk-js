/**
 * Pattern: Middleware Pipeline
 * Use this for processing Discord events in sequence.
 */
export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;
