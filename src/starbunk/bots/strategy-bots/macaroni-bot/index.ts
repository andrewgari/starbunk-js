import { createStrategyBot } from '../../core/bot-builder';
import { MACARONI_BOT_AVATAR_URL, MACARONI_BOT_NAME } from './constants';
import { macaroniTrigger, vennTrigger } from './triggers';

// Create the Macaroni Bot that responds to macaroni/pasta and Venn mentions
export default createStrategyBot({
	name: MACARONI_BOT_NAME,
	description: 'Responds to macaroni/pasta mentions with a joke about Venn',
	defaultIdentity: {
		botName: MACARONI_BOT_NAME,
		avatarUrl: MACARONI_BOT_AVATAR_URL
	},
	triggers: [macaroniTrigger, vennTrigger]
});
