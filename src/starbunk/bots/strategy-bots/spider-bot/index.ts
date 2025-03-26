import { createStrategyBot } from '../../core/bot-builder';
import { SPIDER_BOT_AVATAR_URL, SPIDER_BOT_NAME } from './constants';
import { correctSpellingTrigger, incorrectSpellingTrigger } from './triggers';

// Create the Spider Bot that enforces proper Spider-Man hyphenation
export default createStrategyBot({
	name: SPIDER_BOT_NAME,
	description: 'Enforces proper Spider-Man hyphenation and responds accordingly',
	defaultIdentity: {
		botName: SPIDER_BOT_NAME,
		avatarUrl: SPIDER_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [correctSpellingTrigger, incorrectSpellingTrigger]
});
