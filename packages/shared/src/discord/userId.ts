// ⚠️  DEPRECATED: All user IDs are now stored in the database. Use the UserConfiguration table instead.
//
// This file is kept for backward compatibility only and will be removed in a future version.
//
// NEW USAGE:
// import { ConfigurationService } from '../services/configurationService';
// const configService = new ConfigurationService();
// const userId = await configService.getUserIdByUsername('Chad');
//
// For BunkBot containers, use the BotIdentityService:
// import { BotIdentityService } from '../services/botIdentityService';
// const identity = await identityService.getChadIdentity();

console.warn(
	'⚠️  DEPRECATED: containers/shared/src/discord/userId.ts is deprecated. Use ConfigurationService instead.',
);

export default {
	Cova: '139592376443338752',
	Venn: '151120340343455744',
	Bender: '135820819086573568',
	Sig: '486516247576444928',
	Guy: '113035990725066752',
	Guildus: '113776144012148737',
	Deaf: '115631499344216066',
	Feli: '120263103366692868',
	Goose: '163780525859930112',
	Chad: '85184539906809856',
	Ian: '146110603835080704',
};
