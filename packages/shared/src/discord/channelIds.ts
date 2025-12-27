// ⚠️  DEPRECATED: Hardcoded channel IDs are no longer used.
//
// For channel whitelisting in debug/testing mode, use the TESTING_CHANNEL_IDS environment variable.
// For dynamic channel lookups, use the database via ConfigurationService.
//
// RECOMMENDED USAGE:
// 1. For testing/debug whitelisting:
//    Set TESTING_CHANNEL_IDS environment variable (comma-separated list)
//    Example: TESTING_CHANNEL_IDS=123456789012345678,987654321098765432
//
// 2. For dynamic channel lookups:
//    import { ConfigurationService } from '../services/configurationService';
//    const configService = new ConfigurationService();
//    const channelId = await configService.getChannelIdByName('bot-commands');

console.warn(
	'⚠️  DEPRECATED: packages/shared/src/discord/channelIds.ts is deprecated. Use TESTING_CHANNEL_IDS environment variable or ConfigurationService instead.',
);

// Empty export for backward compatibility - all channel IDs should come from environment or database
export default {};
