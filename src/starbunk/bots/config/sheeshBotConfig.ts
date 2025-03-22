export const SheeshBotConfig = {
	Name: 'Sheesh Bot',
	Avatars: {
		Default: 'https://i.imgflip.com/5fc2iz.png?a471000'
	},
	Patterns: {
		Default: /\bshee+sh\b/i
	},
	Responses: {
		Default: () => {
			// Generate 'sheesh' with a random number of 'e's (between 2 and 20)
			const eCount = 2 + Math.floor(Math.random() * 18);
			return 'sh' + 'e'.repeat(eCount) + 'sh 😤';
		}
	}
};
