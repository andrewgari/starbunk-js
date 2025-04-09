import { BotFactory } from '../../core/bot-factory';
import { HOLD_AVATAR_URL, HOLD_BOT_NAME } from './constants';
import { holdTrigger } from './triggers';

// Create the Hold Bot with minimal configuration
export default BotFactory.createBot({
	name: 'HoldBot',
	description: 'Responds "Hold." when someone says "Hold"',
	defaultIdentity: {
		botName: HOLD_BOT_NAME,
		avatarUrl: HOLD_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [holdTrigger]
});
