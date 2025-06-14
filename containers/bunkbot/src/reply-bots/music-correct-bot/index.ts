import { BotFactory } from '../../core/bot-factory';
import { MUSIC_CORRECT_BOT_AVATAR_URL, MUSIC_CORRECT_BOT_NAME } from './constants';
import { musicCorrectTrigger } from './triggers';

// Create the Music Correct Bot that helps users with the updated music bot commands
export default BotFactory.createBot({
	name: MUSIC_CORRECT_BOT_NAME,
	description: 'Helps users understand the updated music bot commands',
	defaultIdentity: {
		botName: MUSIC_CORRECT_BOT_NAME,
		avatarUrl: MUSIC_CORRECT_BOT_AVATAR_URL
	},
	skipBotMessages: true,
	triggers: [musicCorrectTrigger]
});
