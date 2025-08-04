import { BotFactory } from '../../core/bot-factory';
import { HOLD_AVATAR_URL, HOLD_BOT_NAME } from './constants';
import { holdTrigger } from './triggers';

// Create the Hold Bot with static identity configuration
export default BotFactory.createBot({
	name: 'HoldBot',
	description: 'Responds "Hold." when someone says "Hold"',
	identityConfig: {
		type: 'static',
		identity: {
			botName: HOLD_BOT_NAME,
			avatarUrl: HOLD_AVATAR_URL
		}
	},
	// Legacy fallback for backward compatibility
	defaultIdentity: {
		botName: HOLD_BOT_NAME,
		avatarUrl: HOLD_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [holdTrigger]
});
