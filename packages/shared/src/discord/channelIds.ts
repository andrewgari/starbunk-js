// ⚠️  DEPRECATED: All channel IDs are now stored in the database. Use the Channel table instead.
//
// This file is kept for backward compatibility only and will be removed in a future version.
// Use ConfigurationService for dynamic channel ID lookups.

console.warn(
	'⚠️  DEPRECATED: containers/shared/src/discord/channelIds.ts is deprecated. Use ConfigurationService instead.',
);
export default {
	Starbunk: {
		WhaleWatchers: '767836161619525652',
		NebulaAnnouncments: '925956838036475974',
		NebulaChat: '925956744478343218',
		NebulaBunker: '925957329843798016',
		TheLounge: '754401194788520047',
		NoGuyLounge: '987456522969841824',
		GuyLounge: '989524799044862022',
		AFK: '753251583902482637',
		BotChannel: '753251583084724366',
		BotChannelAdmin: '1014170827601748048',
		StarbunkTesting: '1014170827601748048',
	},
	StarbunkStaging: {
		BotCommmands: '856617421942030361',
		TheLounge: '856617422906851459',
		NebulaChat: '856617421427441674',
		NebulaBunker: '856617421427441674',
	},
	CovaDaxServer: {
		General1: '798613445301633137',
		General2: '842592329651191808',
	},
	Snowfall: {
		Starbunk: '696689954759245915',
	},
	// TTRPG Campaigns
	Campaigns: {
		MadMage: '1300829674854809692',
		HotSprings: '869410394089869312',
	},
};
