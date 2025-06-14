// Constants for Venn Bot

import userId from '../../../../discord/userId';

export const VENN_BOT_NAME = 'VennBot';
export const VENN_AVATAR_URL = 'https://i.imgur.com/1234567890.png';
export const VENN_USER_ID = userId.Venn;
export const VENN_TRIGGER_CHANCE = 1; // 1% chance to trigger
export const VENN_RESPONSE = 'Hmm...';

export const VENN_PATTERNS = {
	Cringe: /cringe/gi
};

export const VENN_RESPONSES = {
	Cringe: [
		'Sorry, but that was über cringe...',
		'Geez, that was hella cringe...',
		'That was cringe to the max...',
		'What a cringe thing to say...',
		'Mondo cringe, man...',
		"Yo that was the cringiest thing I've ever heard...",
		'Your daily serving of cringe, milord...',
		'On a scale of one to cringe, that was pretty cringe...',
		'That was pretty cringe :airplane:',
		'Wow, like....cringe much?',
		'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
		'Like I always say, that was pretty cringe...',
		'C.R.I.N.G.E'
	]
};
