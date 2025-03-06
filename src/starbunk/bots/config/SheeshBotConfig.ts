export const SheeshBotConfig = {
	Name: 'Sheesh Bot',
	Avatars: {
		Default: 'https://i.imgflip.com/5fc2iz.png?a471000'
	},
	Patterns: {
		Default: /\bshee+sh\b/i
	},
	Responses: {
		Default: () => 'Sh' + 'e'.repeat(Math.floor(Math.random() * 50)) + 'sh 😤'
	}
};
