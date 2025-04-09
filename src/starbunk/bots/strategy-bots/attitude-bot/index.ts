import { BotFactory } from '../../core/bot-factory';
import { ATTITUDE_BOT_AVATAR_URL, ATTITUDE_BOT_NAME } from './constants';
import { attitudeTrigger } from './triggers';

// Create the Attitude Bot that responds to negative statements
export default BotFactory.createBot({
	name: ATTITUDE_BOT_NAME,
	description: 'Responds to negative statements with "Well, not with THAT attitude!!!"',
	defaultIdentity: {
		botName: ATTITUDE_BOT_NAME,
		avatarUrl: ATTITUDE_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [attitudeTrigger]
});
