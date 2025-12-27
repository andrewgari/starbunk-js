// ⚠️  DEPRECATED: Hardcoded guild IDs are no longer used.
//
// For guild/server whitelisting in debug/testing mode, use the TESTING_SERVER_IDS environment variable.
// For the primary guild ID, use the GUILD_ID environment variable.
// For dynamic guild lookups, use the database via ConfigurationService.
//
// RECOMMENDED USAGE:
// 1. For primary guild ID:
//    Use GUILD_ID environment variable
//
// 2. For testing/debug whitelisting:
//    Set TESTING_SERVER_IDS environment variable (comma-separated list)
//    Example: TESTING_SERVER_IDS=753251582719688714,987654321098765432
//
// 3. For dynamic guild lookups:
//    import { ConfigurationService } from '../services/configurationService';
//    const configService = new ConfigurationService();
//    const guildId = await configService.getGuildIdByName('Starbunk Crusaders');

console.warn(
	'⚠️  DEPRECATED: packages/shared/src/discord/guildIds.ts is deprecated. Use GUILD_ID, TESTING_SERVER_IDS environment variables or ConfigurationService instead.',
);

// Empty export for backward compatibility - all guild IDs should come from environment or database
export default {};
