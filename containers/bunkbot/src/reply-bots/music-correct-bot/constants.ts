// Constants for Music Correct Bot
export const MUSIC_CORRECT_BOT_NAME = 'Music Correct Bot';
export const MUSIC_CORRECT_BOT_AVATAR_URL = 'https://i.imgur.com/HXVVfyj.png';

export const MUSIC_CORRECT_BOT_PATTERNS = {
	Default: /^[?!]play /i
};

export const MUSIC_CORRECT_BOT_RESPONSE = (id: string) =>
	`Hey <@${id}>, Buddy.
I see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.
Ya see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.
I know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.`;
