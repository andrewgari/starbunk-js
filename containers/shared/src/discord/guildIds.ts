// ⚠️  DEPRECATED: All guild IDs are now stored in the database. Use the Guild table instead.
//
// This file is kept for backward compatibility only and will be removed in a future version.
// Use ConfigurationService for dynamic guild ID lookups.

console.warn('⚠️  DEPRECATED: containers/shared/src/discord/guildIds.ts is deprecated. Use ConfigurationService instead.');
export default {
	StarbunkCrusaders: '753251582719688714',
	StarbunkStaging: '856617421427441674',
	Snowfall: '696689954759245915',
	CovaDaxServer: '798613445301633134',
};
