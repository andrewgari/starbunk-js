import { BotFactory } from '../../core/bot-factory';
import { BABY_BOT_AVATAR_URL, BABY_BOT_NAME } from './constants';
import { babyTrigger } from './triggers';

// Create the Baby Bot that responds with Metroid gif
export default BotFactory.createBot({
	name: BABY_BOT_NAME,
	description: 'Posts a Metroid gif when someone mentions "baby"',
	defaultIdentity: {
		botName: BABY_BOT_NAME,
		avatarUrl: BABY_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [babyTrigger]
});
