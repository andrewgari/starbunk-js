// ⚠️  DEPRECATED: All user IDs should be stored in the database or environment variables.
//
// This file only exports the essential COVA_USER_ID for debug mode filtering.
// All other user IDs should be retrieved from the database using ConfigurationService.
//
// RECOMMENDED USAGE:
// import { ConfigurationService } from '../services/configurationService';
// const configService = new ConfigurationService();
// const userId = await configService.getUserIdByUsername('Chad');
//
// For debug mode filtering, use the COVA_USER_ID environment variable directly:
// const covaUserId = process.env.COVA_USER_ID;

console.warn(
	'⚠️  DEPRECATED: packages/shared/src/discord/userId.ts is deprecated. Use ConfigurationService or environment variables instead.',
);

// Only export Cova ID for debug mode filtering (from environment variable)
export default {
	Cova: process.env.COVA_USER_ID || '139592376443338752',
};
