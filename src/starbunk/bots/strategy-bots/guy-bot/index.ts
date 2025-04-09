import { BotFactory } from '../../core/bot-factory';
import { GUY_BOT_AVATAR_URL, GUY_BOT_NAME } from './constants';
import { guyTrigger } from './triggers';

// Create the Guy Bot that responds to "guy" mentions
export default BotFactory.createBot({
	name: GUY_BOT_NAME,
	description: 'Responds to "guy" mentions with random meme responses',
	defaultIdentity: {
		botName: GUY_BOT_NAME,
		avatarUrl: GUY_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [guyTrigger]
});
