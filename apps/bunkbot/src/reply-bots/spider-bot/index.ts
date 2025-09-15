import { BotFactory } from '../../core/bot-factory';
import { SPIDER_BOT_AVATAR_URL, SPIDER_BOT_NAME } from './constants';
import { correctSpellingTrigger, incorrectSpellingTrigger } from './triggers';

// Create the Spider Bot that enforces proper Spider-Man hyphenation
export default BotFactory.createBot({
	name: SPIDER_BOT_NAME,
	description: 'Enforces proper Spider-Man hyphenation and responds accordingly',
	defaultIdentity: {
		botName: SPIDER_BOT_NAME,
		avatarUrl: SPIDER_BOT_AVATAR_URL,
	},

	triggers: [correctSpellingTrigger, incorrectSpellingTrigger],
});
