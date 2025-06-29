// ⚠️  DEPRECATED: All role IDs are now stored in the database. Use the Role table instead.
//
// This file is kept for backward compatibility only and will be removed in a future version.
// Use ConfigurationService for dynamic role ID lookups.

console.warn('⚠️  DEPRECATED: containers/shared/src/discord/roleIds.ts is deprecated. Use ConfigurationService instead.');
export default {
	Macaroni: '836680699217444924',
	WetBread: '204326753215315968',
	NebulaLead: '925957014587322438',
	RaidTeam: '1115646947198521405',
	Nebula: '925955892212535346',
	NebulaGuest: '975189726959120384',
	NebulaAlum: '1010737828780589086',
	CoLead: '753251582732271680',
	TriviaMaster: '1091933617040670792',
	Ratmas: '919401374448492584',
	HotSpringsGM: '1354646472989081740',
	MadMageGM: '1354646602945659003',
	HotSpringsPlayer: '1107693756997713962',
	MadMagePlayer: '1300828911848001627',
};
