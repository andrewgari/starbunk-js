export const SpiderBotConfig = {
	Name: 'Spider-Bot',
	Avatars: {
		Default: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg'
	},
	Patterns: {
		Default: /spider[^-]?man/i
	},
	Responses: {
		Default: [
			'Hey, it\'s "**Spider-Man**"! Don\'t forget the hyphen!',
			'Um, excuse me? It\'s **Spider-Man**. Hyphen between Spider and Man. Respect the hyphen!',
			'With great power comes great responsibility... to spell **Spider-Man** correctly with a hyphen!',
			'My spider-sense tingles whenever someone forgets the hyphen in **Spider-Man**!',
			'Actually, it\'s **Spider-Man**. You know what separates me from the average arachnid? A hyphen.',
			'J. Jonah Jameson may call me a menace, but even he knows to put the hyphen in **Spider-Man**!',
			'The hyphen in **Spider-Man** is as important as the web in my web-shooters!',
			'**Spider-Man**, two words with a hyphen! Uncle Ben would want you to remember that.',
			'That\'s **Spider-Man** to you! The hyphen is part of my brand identity!',
			'*Swings in dramatically* DID SOMEONE JUST MISSPELL **SPIDER-MAN**?! THE HYPHEN IS SACRED!',
			'*Sticks to ceiling* Listen here, buddy. It\'s **Spider-Man** with a hyphen. Got it? Good talk!',
			'*Shoots web at your keyboard* Let me fix that for you... S-P-I-D-E-R-**HYPHEN**-M-A-N!',
			'As your friendly neighborhood grammar police, I must insist on the hyphen in **Spider-Man**!',
			'*Does theatrical backflip* Ta-da! Just like that hyphen does a flip between Spider and Man!',
			'Thwip thwip! That\'s the sound of me web-slinging AND the sound of typing a hyphen in **Spider-Man**!',
			'Not to be dramatic, but forgetting the hyphen in **Spider-Man** is my villain origin story.',
			'Spider-sense... tingling... someone... forgot... the... HYPHEN! It\'s **Spider-Man**!',
			'With great spelling comes great hyphens! **Spider-Man**! Say it with me!',
			'*Hangs upside down* From this angle, I can clearly see you\'re missing the hyphen in **Spider-Man**.'
		]
	},
	getRandomCheekyResponse: (): string => {
		const responses = SpiderBotConfig.Responses.Default as string[];
		return responses[Math.floor(Math.random() * responses.length)];
	}
};
