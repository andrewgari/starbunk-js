/**
 * This file is no longer needed for bot registration.
 *
 * Bots are now automatically discovered and loaded by the BotRegistry.discoverBots() method.
 * Each bot is in its own directory and is created using the simplified createBot() function.
 *
 * To create a new bot:
 * 1. Create a new directory in the reply-bots directory
 * 2. Create an index.ts file in the new directory
 * 3. Use the createBot() function to define your bot
 *
 * Example:
 * ```typescript
 * import { createBot } from '../../create-bot';
 *
 * export default createBot({
 *   name: 'MyBot',
 *   description: 'My awesome bot',
 *   patterns: [/\bpattern\b/i],
 *   responses: ['Response text'],
 *   avatarUrl: 'https://example.com/avatar.png'
 * });
 * ```
 */

// This empty export is kept for backward compatibility
export const replyBots = [];
export default replyBots;
