import { createStrategyBot } from '../../core/bot-builder';
import { SIG_GREAT_BOT_AVATAR_URL, SIG_GREAT_BOT_NAME } from './constants';
import { sigGreatTrigger } from './triggers';

// Create the SigGreat Bot that responds to praise for Sig
export default createStrategyBot({
	name: SIG_GREAT_BOT_NAME,
	description: 'Responds to praise for Sig with "SigGreat."',
	defaultIdentity: {
		botName: SIG_GREAT_BOT_NAME,
		avatarUrl: SIG_GREAT_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [sigGreatTrigger]
});
