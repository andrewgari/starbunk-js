
export const GuyBotConfig = {
	Name: 'GuyBot',
	Avatars: {
		Default: 'https://i.imgur.com/default-guy.jpg'
	},
	Patterns: {
		Default: /\bguy\b/i
	},
	Responses: {
		Default: () => {
			const responses = [
				'What!? What did you say?',
				'Geeeeeet ready for Shriek Week!',
				'Try and keep up mate....',
				'But Who really died that day.\n...and who came back?',
				'Sheeeeeeeeeeeesh',
				"Rats! Rats! Weeeeeeee're the Rats!",
				'The One Piece is REEEEEEEEEEEEEEEEEEAL',
				'Psh, I dunno about that, Chief...',
				'Come to me my noble EINHERJAHR',
				"If you can't beat em, EAT em!",
				'Have you ever been so sick you sluiced your pants?',
				"Welcome back to ... Melon be Smellin'",
				"Chaotic Evil: Don't Respond. :unamused:",
				':NODDERS: Big Boys... :NODDERS:',
				'Fun Fact: That was actually in XI as well.',
				'Bird Up!',
				'Schlorp',
				"I wouldn't dream of disturbing something so hideously erogenous",
				'Good Year, Good Year',
				'True Grit',
				'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
				"It's a message you can say",
				'Blimbo',
			];
			return responses[Math.floor(Math.random() * responses.length)];
		}
	}
};
