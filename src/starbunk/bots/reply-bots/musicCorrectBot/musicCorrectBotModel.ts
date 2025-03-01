/**
 * Static data for the MusicCorrectBot
 */

export const MUSIC_CORRECT_BOT_AVATAR_URL = 'https://i.imgur.com/v9XsyNc.png';
export const MUSIC_CORRECT_BOT_RESPONSE = `Hey Buddy.
I see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.
Ya see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.
I know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.`;

/**
 * Constants for testing
 */
export const TEST = {
	// User constants
	USER: {
		NAME: 'TestUser',
		BOT_ID: 'bot-id',
		BOT_NAME: 'BotUser'
	},
	// Test message content
	MESSAGE: {
		// Music command patterns
		PLAY_EXCLAMATION: '!play https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		PLAY_QUESTION: '?play https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		PLAY_DASH: '-play https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		PLAY_PLUS: '+play https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		PLAY_SLASH: '/play https://www.youtube.com/watch?v=dQw4w9WgXcQ', // This shouldn't trigger
		UNRELATED: 'Hello there!'
	},
	// Test conditions
	CONDITIONS: {
		TRIGGER: true,
		NO_TRIGGER: false
	}
};
