import { BotFactory } from '../../core/bot-factory';
import { CHAOS_BOT_AVATAR_URL, CHAOS_BOT_NAME } from './constants';
import { chaosTrigger } from './triggers';

// Create the Chaos Bot that responds to chaos mentions
export default BotFactory.createBot({
	name: CHAOS_BOT_NAME,
	description: 'Responds to mentions of "chaos" with a Final Fantasy reference',
	defaultIdentity: {
		botName: CHAOS_BOT_NAME,
		avatarUrl: CHAOS_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [chaosTrigger]
});
