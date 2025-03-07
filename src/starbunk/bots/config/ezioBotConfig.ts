export const EzioBotConfig = {
	Name: 'Ezio Auditore Da Firenze',
	Avatars: {
		Default: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg'
	},
	Patterns: {
		Default: /\bezio|h?assassin.*\b/i
	},
	Responses: {
		Default: (name: string) => `Remember ${name}, Nothing is true; Everything is permitted.`
	}
};
