import { BotFactory } from '../../core/bot-factory';
import { CHECK_BOT_AVATAR_URL, CHECK_BOT_NAME } from './constants';
import { checkTrigger } from './triggers';

// Create the Check Bot that swaps "check" and "czech"
export default BotFactory.createBot({
	name: CHECK_BOT_NAME,
	description: 'Swaps "check" and "czech" in messages',
	defaultIdentity: {
		botName: CHECK_BOT_NAME,
		avatarUrl: CHECK_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [checkTrigger]
});
