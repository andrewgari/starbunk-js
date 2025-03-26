import { createStrategyBot } from '../../core/bot-builder';
import { HOLD_AVATAR_URL, HOLD_BOT_NAME } from './constants';
import { holdTrigger } from './triggers';

// Create the Hold Bot with minimal configuration
export default createStrategyBot({
	name: 'HoldBot',
	description: 'Responds "Hold." when someone says "Hold"',
	defaultIdentity: {
		botName: HOLD_BOT_NAME,
		avatarUrl: HOLD_AVATAR_URL
	},
	triggers: [holdTrigger]
});
