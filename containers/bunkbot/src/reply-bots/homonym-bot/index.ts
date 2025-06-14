import { BotFactory } from '../../core/bot-factory';
import { HOMONYM_BOT_AVATAR_URL, HOMONYM_BOT_NAME } from './constants';
import { homonymTrigger } from './triggers';

// Create the Homonym Bot that corrects commonly confused words
export default BotFactory.createBot({
	name: HOMONYM_BOT_NAME,
	description: 'Corrects commonly confused words like their/there/they\'re with a 15% chance',
	defaultIdentity: {
		botName: HOMONYM_BOT_NAME,
		avatarUrl: HOMONYM_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [homonymTrigger]
});
