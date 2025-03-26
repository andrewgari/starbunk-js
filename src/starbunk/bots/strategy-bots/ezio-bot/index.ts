import { createStrategyBot } from '../../core/bot-builder';
import { EZIO_BOT_AVATAR_URL, EZIO_BOT_NAME } from './constants';
import { ezioTrigger } from './triggers';

// Create the Ezio Bot that responds with Assassin's Creed quotes
export default createStrategyBot({
	name: EZIO_BOT_NAME,
	description: "Responds with Assassin's Creed quotes when someone mentions Ezio or assassins",
	defaultIdentity: {
		botName: EZIO_BOT_NAME,
		avatarUrl: EZIO_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [ezioTrigger]
});
