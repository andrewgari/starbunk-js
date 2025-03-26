import { createStrategyBot } from '../../core/bot-builder';
import { SHEESH_BOT_AVATAR_URL, SHEESH_BOT_NAME } from './constants';
import { sheeshTrigger } from './triggers';

// Create the Sheesh Bot that responds with a dynamic "SHEEEESH"
export default createStrategyBot({
	name: SHEESH_BOT_NAME,
	description: 'Responds to "sheesh" with a dynamic "SHEEEESH" (random number of e\'s)',
	defaultIdentity: {
		botName: SHEESH_BOT_NAME,
		avatarUrl: SHEESH_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [sheeshTrigger]
});
