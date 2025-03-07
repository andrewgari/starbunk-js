
export const VennBotConfig = {
	Name: 'VennBot',
	Avatars: {
		Default: 'https://i.imgur.com/1234567890.png'
	},
	Patterns: {
		Default: /cringe/gi
	},
	Responses: {
		Default: () => {
			const responses = [
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
			];
			return responses[Math.floor(Math.random() * responses.length)];
		}
	}
};
