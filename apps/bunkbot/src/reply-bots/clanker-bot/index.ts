import { BotFactory } from '../../core/bot-factory';
import { CLANKER_BOT_AVATARS, CLANKER_BOT_NAME } from './constants';
import { clankerTrigger } from './triggers';

// Export the reply bot implementation
export default BotFactory.createBot({
	name: CLANKER_BOT_NAME, // internal bot name used by registry/logs
	description: 'Responds to the slur "clanker" with HK-47\'s snide commentary.',
	defaultIdentity: {
		botName: 'HK-47', // display name in Discord
		avatarUrl: CLANKER_BOT_AVATARS.HK47,
	},
	triggers: [clankerTrigger],
	responseRate: 100,
});
